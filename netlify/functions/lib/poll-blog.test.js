// Unit tests for poll-blog.js (Task 3, the scheduled poller). No live
// network, no real Squarespace/Sheets/Blobs credentials:
//   - Squarespace list-JSON fetches go through fetchConfig's fetchImpl (the
//     same test seam squarespaceBlog.test.js already established, forwarded
//     straight through by iterateCollectionItems/fetchBlogListPage).
//   - Sheets calls go through a global.fetch mock router, same throwaway
//     RSA-key-service-account pattern sheets.test.js already established
//     (getAccessToken's real JWT-signing code path runs, just against a
//     fake key -- no live Google credentials needed).
//   - Blobs reads/writes go through injected getJSONFn/setJSONFn (no real
//     Netlify Blobs runtime context needed).
//
// Coverage matches the brief's ask: the per-collection loop, how the poller
// decides page 1 is enough vs. needs more, which posts end up inserted vs.
// updated (i.e. "genuinely new" vs. "already cached" by id -- this poller
// always re-fetches the newest POSTS_PER_COLLECTION regardless, so an edit
// to an already-cached post is caught by re-checking it, not by a separate
// webhook/notification), and that a post whose re-fetched content is
// byte-identical to what's already in Blobs gets no redundant write.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { collectRecentPosts, runPollBlog } from '../poll-blog.js';
import { BLOG_COLLECTIONS, BLOG_BODIES_STORE } from './squarespaceBlog.js';
import { normalizeBlogHtml } from './normalizeBlogHtml.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const FAKE_SERVICE_ACCOUNT = {
  client_email: 'test@example.iam.gserviceaccount.com',
  private_key: privateKey,
};
process.env.SPREADSHEET_ID = 'test-spreadsheet-id';
process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 = Buffer.from(JSON.stringify(FAKE_SERVICE_ACCOUNT)).toString('base64');

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

// Builds one synthetic Squarespace list item with real confirmed field
// names (id/title/fullUrl/publishOn/assetUrl/author.displayName/body).
function makeItem(collection, n) {
  return {
    id: `${collection}-${n}`,
    title: `Post ${n}`,
    fullUrl: `/${collection}/post-${n}`,
    publishOn: 1700000000000 - n * 1000,
    assetUrl: `https://images.example.com/${n}.jpg`,
    author: { displayName: 'Frank' },
    body: `<p>Body ${n}</p>`,
  };
}

function makePage(items, { nextPage = false, nextPageOffset = null } = {}) {
  return { items, pagination: { nextPage, nextPageOffset } };
}

// Installs a fetch mock that answers Google's OAuth token endpoint plus
// whatever Sheets-API handlers are given. Returns the call log + a restore
// function, same shape as sheets.test.js's installFetchMock.
function installSheetsFetchMock(handlers) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, init = {}) => {
    const urlStr = String(url);
    calls.push({ url: urlStr, method: init.method || 'GET', body: init.body });
    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return jsonResponse(200, { access_token: 'fake-access-token', expires_in: 3600 });
    }
    for (const handler of handlers) {
      const result = handler(urlStr, init);
      if (result) return result;
    }
    throw new Error(`Unhandled mock Sheets fetch call: ${init.method || 'GET'} ${urlStr}`);
  };
  return { calls, restore: () => { global.fetch = original; } };
}

// Default set of Sheets handlers a full runPollBlog() pass needs: tab
// already exists (ensureBlogPostsTabExists no-ops), column A read returns
// `existingIds` (header + any pre-existing post ids), and append/update/
// batchUpdate calls all succeed. Lets each test override just what it cares
// about by prepending more specific handlers.
function defaultSheetsHandlers(existingIds = ['id']) {
  return [
    (url, init) => {
      if (url.includes('fields=sheets.properties')) {
        return jsonResponse(200, { sheets: [{ properties: { sheetId: 1, title: 'blog posts' } }] });
      }
    },
    (url, init) => {
      if (url.includes('/values/') && (!init.method || init.method === 'GET')) {
        return jsonResponse(200, { values: existingIds.map((id) => [id]) });
      }
    },
    (url, init) => {
      if (url.includes(':append') && init.method === 'POST') {
        return jsonResponse(200, { updates: { updatedRows: JSON.parse(init.body).values.length } });
      }
    },
    (url, init) => {
      if (url.endsWith(':batchUpdate') && init.method === 'POST') {
        return jsonResponse(200, { replies: [] });
      }
    },
  ];
}

// ---- collectRecentPosts: page-1-sufficiency / pagination decision ----

test('collectRecentPosts: page 1 alone satisfies the limit -> no second page fetched', async () => {
  const items = Array.from({ length: 12 }, (_, i) => makeItem('quite-frankly-originals', i));
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return jsonResponse(200, makePage(items, { nextPage: true, nextPageOffset: 999 }));
  };
  const posts = await collectRecentPosts('quite-frankly-originals', 10, { fetchImpl, sleepFn: async () => {} });
  assert.equal(posts.length, 10);
  assert.equal(calls, 1, 'must not fetch page 2 once the limit is already met on page 1');
  assert.equal(posts[0].id, 'quite-frankly-originals-0');
  assert.equal(posts[9].id, 'quite-frankly-originals-9');
});

test('collectRecentPosts: fewer than the limit on page 1 -> pages further to fill the limit', async () => {
  const page1Items = Array.from({ length: 4 }, (_, i) => makeItem('original-articles', i));
  const page2Items = Array.from({ length: 8 }, (_, i) => makeItem('original-articles', 4 + i));
  let call = 0;
  const seenUrls = [];
  const fetchImpl = async (url) => {
    call++;
    seenUrls.push(String(url));
    if (call === 1) return jsonResponse(200, makePage(page1Items, { nextPage: true, nextPageOffset: 42 }));
    return jsonResponse(200, makePage(page2Items, { nextPage: true, nextPageOffset: 43 }));
  };
  const posts = await collectRecentPosts('original-articles', 10, { fetchImpl, sleepFn: async () => {} });
  assert.equal(posts.length, 10, 'stops as soon as the limit is reached, even mid-page-2');
  assert.equal(call, 2, 'fetches exactly one more page when page 1 came up short');
  assert.ok(!seenUrls[0].includes('offset='));
  assert.ok(seenUrls[1].includes('offset=42'));
  assert.equal(posts[9].id, 'original-articles-9'); // 4 from page1 + first 6 of page2
});

test('collectRecentPosts: fewer posts exist than the limit anywhere -> returns everything found, no infinite loop', async () => {
  const items = Array.from({ length: 3 }, (_, i) => makeItem('original-articles', i));
  const fetchImpl = async () => jsonResponse(200, makePage(items, { nextPage: false }));
  const posts = await collectRecentPosts('original-articles', 10, { fetchImpl, sleepFn: async () => {} });
  assert.equal(posts.length, 3);
});

test('collectRecentPosts: normalizes bodyHtml and computes readMinutes off the normalized body', async () => {
  const item = {
    ...makeItem('quite-frankly-originals', 0),
    body: '<script>evil()</script><p>hello world</p><img data-src="//cdn.example.com/x.jpg">',
  };
  const fetchImpl = async () => jsonResponse(200, makePage([item], { nextPage: false }));
  const posts = await collectRecentPosts('quite-frankly-originals', 10, { fetchImpl, sleepFn: async () => {} });
  assert.equal(posts.length, 1);
  assert.ok(!posts[0].bodyHtml.includes('<script>'), 'script tags must be stripped at write time');
  assert.ok(posts[0].bodyHtml.includes('src="https://cdn.example.com/x.jpg"'), 'data-src must be rewritten to an absolute https src');
  assert.equal(posts[0].readMinutes, 1);
});

// ---- runPollBlog: end-to-end orchestration ----

test('runPollBlog: writes blobs before Sheet rows, and inserts vs. updates by id (already-cached posts are always re-upserted)', async () => {
  const newItem = makeItem('quite-frankly-originals', 100); // id "quite-frankly-originals-100", not in existing sheet
  const cachedItem = makeItem('quite-frankly-originals', 101); // id will be seeded as already-existing
  const fetchImpl = async (url) => {
    if (String(url).includes('original-articles')) {
      return jsonResponse(200, makePage([], { nextPage: false }));
    }
    return jsonResponse(200, makePage([newItem, cachedItem], { nextPage: false }));
  };

  // Shared event log so blob-write-vs-Sheet-write ORDER can actually be
  // asserted, not just that both eventually happened.
  const events = [];
  const blobCalls = [];
  const setJSONFn = async (storeName, key, value) => {
    events.push('blob');
    blobCalls.push({ storeName, key, value });
  };

  const existingIds = ['id', 'quite-frankly-originals-101']; // row 1 = header, row 2 = the cached post
  const sheetCalls = [];
  const mock = installSheetsFetchMock([
    ...defaultSheetsHandlers(existingIds),
  ]);
  // Wrap fetch to also record append/update payloads (and event order) for
  // assertion below.
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    const urlStr = String(url);
    if (init.method === 'POST' && urlStr.includes(':append')) events.push('append');
    if (init.method === 'POST' && urlStr.endsWith(':batchUpdate') && JSON.parse(init.body || '{}').data) events.push('update');
    sheetCalls.push({ url: urlStr, method: init.method, body: init.body });
    return originalFetch(url, init);
  };

  try {
    const result = await runPollBlog({ fetchConfig: { fetchImpl, sleepFn: async () => {} }, setJSONFn, getJSONFn: async () => null });

    assert.equal(result.fetched, 2);
    assert.equal(result.written, 2);
    assert.equal(result.blobFailures, 0);
    assert.equal(result.inserted, 1, 'the never-before-seen post id inserts');
    assert.equal(result.updated, 1, 'the already-cached post id updates instead of duplicating');
    assert.deepEqual(result.perCollectionCounts, {
      'quite-frankly-originals': 2,
      'original-articles': 0,
    });

    assert.equal(blobCalls.length, 2, 'both posts get a blob write');
    assert.deepEqual(blobCalls.map((c) => c.storeName), [BLOG_BODIES_STORE, BLOG_BODIES_STORE]);

    const appendCall = sheetCalls.find((c) => c.url.includes(':append'));
    const appendPayload = JSON.parse(appendCall.body);
    assert.equal(appendPayload.values.length, 1);
    assert.equal(appendPayload.values[0][0], 'quite-frankly-originals-100');

    const updateCall = sheetCalls.find((c) => c.url.endsWith(':batchUpdate') && JSON.parse(c.body).data);
    const updatePayload = JSON.parse(updateCall.body);
    assert.equal(updatePayload.data.length, 1);
    assert.equal(updatePayload.data[0].values[0][0], 'quite-frankly-originals-101');

    // Blob writes for both posts must have happened before either the
    // append or the update Sheets call (blob-first invariant).
    assert.deepEqual(events.filter((e) => e === 'blob'), ['blob', 'blob']);
    const lastBlobIndex = events.lastIndexOf('blob');
    const firstSheetWriteIndex = events.findIndex((e) => e === 'append' || e === 'update');
    assert.ok(firstSheetWriteIndex > lastBlobIndex, 'both blobs are written before any Sheet row write is attempted');
  } finally {
    global.fetch = originalFetch;
    mock.restore();
  }
});

test('runPollBlog: a failed blob write skips that post -- it never gets a Sheet row', async () => {
  const okItem = makeItem('quite-frankly-originals', 0);
  const badItem = makeItem('quite-frankly-originals', 1);
  const fetchImpl = async (url) => {
    if (String(url).includes('original-articles')) return jsonResponse(200, makePage([], { nextPage: false }));
    return jsonResponse(200, makePage([okItem, badItem], { nextPage: false }));
  };
  const setJSONFn = async (storeName, key) => {
    if (key === badItem.id) throw new Error('blob quota exceeded');
  };

  const mock = installSheetsFetchMock(defaultSheetsHandlers(['id']));
  const originalFetch = global.fetch;
  const sheetCalls = [];
  global.fetch = async (url, init = {}) => {
    sheetCalls.push({ url: String(url), body: init.body });
    return originalFetch(url, init);
  };

  try {
    const result = await runPollBlog({ fetchConfig: { fetchImpl, sleepFn: async () => {} }, setJSONFn, getJSONFn: async () => null });
    assert.equal(result.fetched, 2);
    assert.equal(result.written, 1);
    assert.equal(result.blobFailures, 1);
    assert.equal(result.inserted, 1);

    const appendCall = sheetCalls.find((c) => c.url.includes(':append'));
    const appendPayload = JSON.parse(appendCall.body);
    assert.equal(appendPayload.values.length, 1);
    assert.equal(appendPayload.values[0][0], okItem.id, 'only the post whose blob write succeeded gets a Sheet row');
  } finally {
    global.fetch = originalFetch;
    mock.restore();
  }
});

test('runPollBlog: a post whose normalized content is unchanged since last run gets no blob write and no Sheet row', async () => {
  const unchangedItem = makeItem('quite-frankly-originals', 0);
  const editedItem = makeItem('quite-frankly-originals', 1);
  const fetchImpl = async (url) => {
    if (String(url).includes('original-articles')) return jsonResponse(200, makePage([], { nextPage: false }));
    return jsonResponse(200, makePage([unchangedItem, editedItem], { nextPage: false }));
  };

  // What's already in Blobs for each id, from a prior run: item 0's body
  // exactly matches what it'll be re-normalized to now (unchanged); item
  // 1's stored body is stale/different (a real edit since last time).
  const { html: unchangedNormalizedHtml } = normalizeBlogHtml(unchangedItem.body);
  const existingBlobs = {
    [unchangedItem.id]: { bodyHtml: unchangedNormalizedHtml, readMinutes: 1 },
    [editedItem.id]: { bodyHtml: '<p>a stale, previously-cached version</p>', readMinutes: 1 },
  };
  const getJSONFn = async (storeName, key) => {
    assert.equal(storeName, BLOG_BODIES_STORE);
    return existingBlobs[key] ?? null;
  };

  const blobWriteKeys = [];
  const setJSONFn = async (storeName, key) => {
    blobWriteKeys.push(key);
  };

  const existingIds = ['id', unchangedItem.id, editedItem.id]; // both already have Sheet rows from "last run"
  const mock = installSheetsFetchMock(defaultSheetsHandlers(existingIds));
  try {
    const result = await runPollBlog({ fetchConfig: { fetchImpl, sleepFn: async () => {} }, setJSONFn, getJSONFn });

    assert.equal(result.fetched, 2, 'both posts were re-fetched from Squarespace, per the daily re-check design');
    assert.equal(result.unchanged, 1, 'exactly one of the two was recognized as unchanged');
    assert.equal(result.written, 1, 'only the genuinely-edited post gets written');
    assert.equal(result.updated, 1);
    assert.equal(result.inserted, 0);

    assert.deepEqual(blobWriteKeys, [editedItem.id], 'the unchanged post never gets a blob write at all');
  } finally {
    mock.restore();
  }
});

test('runPollBlog: polls every collection in BLOG_COLLECTIONS', async () => {
  const requestedCollections = new Set();
  const fetchImpl = async (url) => {
    for (const c of BLOG_COLLECTIONS) {
      if (String(url).includes(`/${c}?`)) requestedCollections.add(c);
    }
    return jsonResponse(200, makePage([], { nextPage: false }));
  };
  const mock = installSheetsFetchMock(defaultSheetsHandlers(['id']));
  try {
    const result = await runPollBlog({ fetchConfig: { fetchImpl, sleepFn: async () => {} }, setJSONFn: async () => {}, getJSONFn: async () => null });
    assert.deepEqual([...requestedCollections].sort(), [...BLOG_COLLECTIONS].sort());
    assert.equal(result.fetched, 0);
  } finally {
    mock.restore();
  }
});
