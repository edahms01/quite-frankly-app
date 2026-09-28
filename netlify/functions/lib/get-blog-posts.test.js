// Unit tests for get-blog-posts.js (Task 4, the read function). No live
// network, no real Sheets/Blobs credentials: list mode is exercised via
// listBlogPosts's injected getRowsFn seam (mocked Sheet rows), single-post
// mode via getBlogPostById's injected getJSONFn seam (mocked Blob reads) --
// same "inject the real dependency, no global mocking needed" pattern this
// feature's other tasks use for their pure/orchestration-only test seams.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { listBlogPosts, getBlogPostById, clampLimit } from './get-blog-posts.js';
import { BLOG_POSTS_HEADER } from './lib/sheets.js';

// Builds one 'blog posts' Sheet row-array in BLOG_POSTS_HEADER's exact
// column order (id, collection, title, url, publishedAt, heroImageUrl,
// readMinutes, author), from a plain object -- so tests read like data, not
// positional arrays.
function makeRow(fields) {
  return BLOG_POSTS_HEADER.map((key) => fields[key] ?? '');
}

const HEADER_ROW = BLOG_POSTS_HEADER;

// ---- clampLimit ----

test('clampLimit: omitted -> default 15', () => {
  assert.equal(clampLimit(null), 15);
  assert.equal(clampLimit(undefined), 15);
  assert.equal(clampLimit(''), 15);
});

test('clampLimit: non-numeric -> default 15', () => {
  assert.equal(clampLimit('abc'), 15);
  assert.equal(clampLimit('NaN'), 15);
});

test('clampLimit: below 1 clamps up to 1', () => {
  assert.equal(clampLimit('0'), 1);
  assert.equal(clampLimit('-5'), 1);
});

test('clampLimit: above 20 clamps down to 20', () => {
  assert.equal(clampLimit('21'), 20);
  assert.equal(clampLimit('1000'), 20);
});

test('clampLimit: in-range numeric value passes through', () => {
  assert.equal(clampLimit('7'), 7);
  assert.equal(clampLimit('1'), 1);
  assert.equal(clampLimit('20'), 20);
});

// ---- listBlogPosts ----

test('listBlogPosts: normal pagination, newest-first, respects limit and returns a usable nextCursor', async () => {
  const rows = [
    HEADER_ROW,
    makeRow({ id: 'p1', publishedAt: '2026-09-01T00:00:00.000Z', title: 'Post 1' }),
    makeRow({ id: 'p2', publishedAt: '2026-09-03T00:00:00.000Z', title: 'Post 2' }),
    makeRow({ id: 'p3', publishedAt: '2026-09-02T00:00:00.000Z', title: 'Post 3' }),
  ];
  const getRowsFn = async (tab, range) => {
    assert.equal(tab, 'blog posts');
    assert.equal(range, 'A:H');
    return rows;
  };

  const result = await listBlogPosts({ limit: '2', getRowsFn });
  assert.equal(result.posts.length, 2);
  assert.deepEqual(result.posts.map((p) => p.id), ['p2', 'p3'], 'newest publishedAt first');
  assert.equal(result.hasMore, true);
  assert.equal(result.nextCursor, '2026-09-02T00:00:00.000Z|p3');
});

test('listBlogPosts: last page terminates with hasMore false and nextCursor null', async () => {
  const rows = [
    HEADER_ROW,
    makeRow({ id: 'p1', publishedAt: '2026-09-01T00:00:00.000Z' }),
    makeRow({ id: 'p2', publishedAt: '2026-09-02T00:00:00.000Z' }),
  ];
  const getRowsFn = async () => rows;

  const result = await listBlogPosts({ limit: '10', getRowsFn });
  assert.equal(result.posts.length, 2);
  assert.equal(result.hasMore, false);
  assert.equal(result.nextCursor, null);
});

test('listBlogPosts: composite-cursor tiebreak -- two posts sharing an exact publishedAt are neither skipped nor duplicated across a page boundary', async () => {
  // Three posts share the exact same publishedAt; only id differs. Sorted
  // descending by (publishedAt, id): tie-a, tie-b, tie-c (ids compare
  // string-descending: 'tie-c' > 'tie-b' > 'tie-a', so real order is
  // tie-c, tie-b, tie-a).
  const rows = [
    HEADER_ROW,
    makeRow({ id: 'tie-a', publishedAt: '2026-09-05T00:00:00.000Z' }),
    makeRow({ id: 'tie-b', publishedAt: '2026-09-05T00:00:00.000Z' }),
    makeRow({ id: 'tie-c', publishedAt: '2026-09-05T00:00:00.000Z' }),
  ];
  const getRowsFn = async () => rows;

  // Page 1: limit 2 -> expect [tie-c, tie-b], cursor lands mid-tie.
  const page1 = await listBlogPosts({ limit: '2', getRowsFn });
  assert.deepEqual(page1.posts.map((p) => p.id), ['tie-c', 'tie-b']);
  assert.equal(page1.hasMore, true);
  assert.equal(page1.nextCursor, '2026-09-05T00:00:00.000Z|tie-b');

  // Page 2, resuming from that cursor: must return exactly tie-a -- not
  // re-return tie-b (a `<=` bug) and not skip past tie-a (a `<` bug that
  // treated the whole tied group as already consumed).
  const page2 = await listBlogPosts({ cursor: page1.nextCursor, limit: '2', getRowsFn });
  assert.deepEqual(page2.posts.map((p) => p.id), ['tie-a']);
  assert.equal(page2.hasMore, false);
  assert.equal(page2.nextCursor, null);
});

test('listBlogPosts: cursor resumption with distinct publishedAt values (no tie) still works', async () => {
  const rows = [
    HEADER_ROW,
    makeRow({ id: 'a', publishedAt: '2026-09-01T00:00:00.000Z' }),
    makeRow({ id: 'b', publishedAt: '2026-09-02T00:00:00.000Z' }),
    makeRow({ id: 'c', publishedAt: '2026-09-03T00:00:00.000Z' }),
  ];
  const getRowsFn = async () => rows;

  const page1 = await listBlogPosts({ limit: '1', getRowsFn });
  assert.deepEqual(page1.posts.map((p) => p.id), ['c']);
  const page2 = await listBlogPosts({ cursor: page1.nextCursor, limit: '1', getRowsFn });
  assert.deepEqual(page2.posts.map((p) => p.id), ['b']);
  const page3 = await listBlogPosts({ cursor: page2.nextCursor, limit: '1', getRowsFn });
  assert.deepEqual(page3.posts.map((p) => p.id), ['a']);
  assert.equal(page3.hasMore, false);
  assert.equal(page3.nextCursor, null);
});

test('listBlogPosts: response never includes bodyHtml (Sheet is metadata-only)', async () => {
  const rows = [HEADER_ROW, makeRow({ id: 'p1', publishedAt: '2026-09-01T00:00:00.000Z' })];
  const getRowsFn = async () => rows;
  const result = await listBlogPosts({ getRowsFn });
  assert.ok(!('bodyHtml' in result.posts[0]));
});

// ---- getBlogPostById ----

test('getBlogPostById: success -- returns body + readMinutes from the blob payload', async () => {
  const getJSONFn = async (storeName, key, fallback) => {
    assert.equal(storeName, 'blog-bodies');
    assert.equal(key, 'post-123');
    return { bodyHtml: '<p>hello</p>', readMinutes: 4 };
  };
  const post = await getBlogPostById('post-123', { getJSONFn });
  assert.deepEqual(post, { id: 'post-123', bodyHtml: '<p>hello</p>', readMinutes: 4 });
});

test('getBlogPostById: nonexistent blob -> null (handler turns this into 400)', async () => {
  const getJSONFn = async (storeName, key, fallback) => fallback;
  const post = await getBlogPostById('missing-id', { getJSONFn });
  assert.equal(post, null);
});

test('getBlogPostById: missing/empty id -> null without calling getJSONFn', async () => {
  let called = false;
  const getJSONFn = async () => {
    called = true;
    return null;
  };
  const post = await getBlogPostById('', { getJSONFn });
  assert.equal(post, null);
  assert.equal(called, false);
});

// ---- default handler: mode selection / 400s that don't require I/O ----

function makeReq(query) {
  return { url: `https://example.com/.netlify/functions/get-blog-posts${query}` };
}

test('handler: id present but empty -> 400, never reaches list mode', async () => {
  const res = await handler(makeReq('?id='));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /Missing required "id"/);
});
