// Unit tests for poll-newsletter.js. Same test-seam/mock patterns as
// poll-blog.test.js (fetchConfig.fetchImpl for Squarespace, a global.fetch
// router for Sheets, injected getJSONFn/setJSONFn for Blobs) -- pagination
// internals (page-1-sufficiency, entity decoding) are already covered by
// squarespaceBlog.test.js/squarespaceNewsletter.test.js since
// collectRecentPosts delegates to the same shared iterateCollectionItems.
// This file focuses on what's specific to the poller: the time guard, the
// unchanged-post skip path, and end-to-end insert/update orchestration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { collectRecentPosts, runPollNewsletter, timeBoxPosts } from '../poll-newsletter.js';
import { NEWSLETTER_BODIES_STORE } from './squarespaceNewsletter.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const FAKE_SERVICE_ACCOUNT = { client_email: 'test@example.iam.gserviceaccount.com', private_key: privateKey };
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

function makeItem(n) {
  return {
    id: `newsletter-content-${n}`,
    title: `Post ${n}`,
    fullUrl: `/newsletter-content/post-${n}`,
    publishOn: 1700000000000 - n * 1000,
    assetUrl: `https://images.example.com/${n}.jpg`,
    author: { id: 'someone-else', displayName: 'Contributor' },
    categories: ['Recipe'],
    body: `<p>Body ${n}</p>`,
  };
}

function makePage(items, { nextPage = false, nextPageOffset = null } = {}) {
  return { items, pagination: { nextPage, nextPageOffset } };
}

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

function defaultSheetsHandlers(existingIds = ['id']) {
  return [
    (url) => {
      if (url.includes('fields=sheets.properties')) {
        return jsonResponse(200, { sheets: [{ properties: { sheetId: 1, title: 'newsletter posts' } }] });
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

// ---- timeBoxPosts ----

test('timeBoxPosts: posts started before the guard trips stay in-budget, the rest are deferred', () => {
  const posts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  let elapsed = 0;
  const now = () => elapsed;
  // First check at elapsed=0 (< 10 guard) -> in budget; bump past the guard
  // before the second check.
  const result = timeBoxPosts(posts, 0, () => {
    const v = elapsed;
    elapsed = 20;
    return v;
  }, 10);
  assert.deepEqual(result.inBudget.map((p) => p.id), ['a']);
  assert.deepEqual(result.deferred.map((p) => p.id), ['b', 'c']);
});

test('timeBoxPosts: nothing deferred when well under the guard', () => {
  const posts = [{ id: 'a' }, { id: 'b' }];
  const result = timeBoxPosts(posts, 0, () => 1, 22_000);
  assert.deepEqual(result.deferred, []);
  assert.equal(result.inBudget.length, 2);
});

// ---- collectRecentPosts: category fields survive the poller path ----

test('collectRecentPosts: carries category/categories through, same as the backfill path', async () => {
  const fetchImpl = async () => jsonResponse(200, makePage([makeItem(0)], { nextPage: false }));
  const posts = await collectRecentPosts('newsletter-content', 3, { fetchImpl, sleepFn: async () => {} });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].category, 'Recipe');
  assert.deepEqual(posts[0].categories, ['Recipe']);
});

// ---- runPollNewsletter: end-to-end ----

test('runPollNewsletter: writes blobs before Sheet rows, unchanged posts are skipped', async () => {
  const unchangedItem = makeItem(1); // will be reported as already-matching in Blobs
  const changedItem = makeItem(2);
  const fetchImpl = async () => jsonResponse(200, makePage([unchangedItem, changedItem], { nextPage: false }));

  const events = [];
  const blobWrites = [];
  const setJSONFn = async (storeName, key, value) => {
    events.push('blob');
    blobWrites.push({ storeName, key, value });
  };
  const getJSONFn = async (storeName, key) => {
    if (key === unchangedItem.id) {
      // Pretend the poller already wrote this exact normalized body last run.
      const { normalizeBlogHtml } = await import('./normalizeBlogHtml.js');
      const { html } = normalizeBlogHtml(unchangedItem.body);
      return { bodyHtml: html, readMinutes: 1 };
    }
    return null;
  };

  const mock = installSheetsFetchMock(defaultSheetsHandlers(['id']));
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    const urlStr = String(url);
    if (init.method === 'POST' && urlStr.includes(':append')) events.push('append');
    return originalFetch(url, init);
  };

  try {
    const result = await runPollNewsletter({
      fetchConfig: { fetchImpl, sleepFn: async () => {} },
      setJSONFn,
      getJSONFn,
      now: Date.now,
    });

    assert.equal(result.unchanged, 1, 'the byte-identical post must be skipped, not rewritten');
    assert.equal(result.written, 1);
    assert.equal(blobWrites.length, 1);
    assert.equal(blobWrites[0].storeName, NEWSLETTER_BODIES_STORE);
    assert.equal(blobWrites[0].key, changedItem.id);
    assert.deepEqual(events, ['blob', 'append'], 'the blob write must happen before the Sheet append');
  } finally {
    mock.restore();
    global.fetch = originalFetch;
  }
});

test('runPollNewsletter: nothing changed -> no Sheet write calls at all', async () => {
  const item = makeItem(3);
  const fetchImpl = async () => jsonResponse(200, makePage([item], { nextPage: false }));
  const { normalizeBlogHtml } = await import('./normalizeBlogHtml.js');
  const { html } = normalizeBlogHtml(item.body);
  const getJSONFn = async () => ({ bodyHtml: html, readMinutes: 1 });
  const setJSONFn = async () => { throw new Error('must not write a blob for an unchanged post'); };

  let sheetsFetchCalled = false;
  const mock = installSheetsFetchMock([
    (url) => {
      if (url.includes('fields=sheets.properties')) {
        sheetsFetchCalled = true;
        return jsonResponse(200, { sheets: [{ properties: { sheetId: 1, title: 'newsletter posts' } }] });
      }
    },
  ]);

  try {
    const result = await runPollNewsletter({ fetchConfig: { fetchImpl, sleepFn: async () => {} }, setJSONFn, getJSONFn, now: Date.now });
    assert.equal(result.written, 0);
    assert.equal(result.inserted, 0);
    assert.equal(result.updated, 0);
    assert.ok(sheetsFetchCalled, 'ensureNewsletterPostsTabExists still runs');
  } finally {
    mock.restore();
  }
});
