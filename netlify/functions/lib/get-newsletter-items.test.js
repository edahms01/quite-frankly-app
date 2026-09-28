// Unit tests for get-newsletter-items.js. Same "inject getRowsFn/getJSONFn,
// no live credentials" pattern as get-blog-posts.test.js, extended for two
// merged Sheet tabs (posts + bulletins) and the two auxiliary modes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, {
  listNewsletterItems,
  listNewsletterMonths,
  listNewsletterCategories,
  findNewsletterPostByUrl,
  getNewsletterPostById,
  clampLimit,
} from '../get-newsletter-items.js';
import { NEWSLETTER_POSTS_HEADER, BULLETINS_HEADER } from './sheets.js';

function makePostRow(fields) {
  const categories = fields.categories ?? [];
  return NEWSLETTER_POSTS_HEADER.map((key) => {
    if (key === 'categories') return categories.join(',');
    if (key === 'category') return fields.category ?? categories[0] ?? '';
    return fields[key] ?? '';
  });
}

function makeBulletinRow(fields) {
  return BULLETINS_HEADER.map((key) => fields[key] ?? '');
}

const POST_HEADER_ROW = NEWSLETTER_POSTS_HEADER;
const BULLETIN_HEADER_ROW = BULLETINS_HEADER;

function makeGetRowsFn({ postRows = [POST_HEADER_ROW], bulletinRows = [BULLETIN_HEADER_ROW] } = {}) {
  return async (tab) => {
    if (tab === 'newsletter posts') return postRows;
    if (tab === 'bulletins') return bulletinRows;
    throw new Error(`unexpected tab: ${tab}`);
  };
}

// ---- clampLimit ----

test('clampLimit: same clamping behavior as get-blog-posts.js', () => {
  assert.equal(clampLimit(null), 15);
  assert.equal(clampLimit('0'), 1);
  assert.equal(clampLimit('21'), 20);
  assert.equal(clampLimit('7'), 7);
});

// ---- cursor / merge order, including the bulletin/post collision guard ----

test('listNewsletterItems: merges posts and bulletins, newest publishedAt first', async () => {
  const postRows = [
    POST_HEADER_ROW,
    makePostRow({ id: 'p1', publishedAt: '2025-07-01T00:00:00.000Z', title: 'Post 1', categories: ['Recipe'] }),
  ];
  const bulletinRows = [
    BULLETIN_HEADER_ROW,
    makeBulletinRow({ id: '2025-07', title: 'July 2025 Bulletin', publishedAt: '2025-07-07T00:00:00.000Z', url: 'https://example.com/b' }),
  ];
  const getRowsFn = makeGetRowsFn({ postRows, bulletinRows });

  const result = await listNewsletterItems({ getRowsFn });
  assert.deepEqual(result.items.map((i) => `${i.type}:${i.id}`), ['bulletin:2025-07', 'post:p1']);
});

test('listNewsletterItems: a post id and a bulletin id colliding as raw strings, with the same publishedAt, are not treated as the same item', async () => {
  // Deliberately identical publishedAt AND identical raw id across the two
  // tabs -- proves the sortId bulletin: prefix (not the raw id) drives the
  // cursor/compare, per the plan's design. A bug here would silently drop
  // one of the two items across a page boundary.
  const SAME_TS = '2025-07-01T00:00:00.000Z';
  const postRows = [POST_HEADER_ROW, makePostRow({ id: 'collide', publishedAt: SAME_TS, title: 'Post', categories: [] })];
  const bulletinRows = [BULLETIN_HEADER_ROW, makeBulletinRow({ id: 'collide', title: 'Bulletin', publishedAt: SAME_TS, url: 'https://x' })];
  const getRowsFn = makeGetRowsFn({ postRows, bulletinRows });

  const page1 = await listNewsletterItems({ limit: '1', getRowsFn });
  assert.equal(page1.items.length, 1);
  assert.equal(page1.hasMore, true);

  const page2 = await listNewsletterItems({ cursor: page1.nextCursor, limit: '1', getRowsFn });
  assert.equal(page2.items.length, 1, 'the second item must still be returned, not skipped as a duplicate');
  assert.notEqual(page1.items[0].type, page2.items[0].type, 'the two items are distinct (one post, one bulletin)');
  assert.equal(page2.hasMore, false);
});

test('listNewsletterItems: cursor round-trip across multiple pages, no gaps or repeats', async () => {
  const postRows = [
    POST_HEADER_ROW,
    makePostRow({ id: 'p1', publishedAt: '2025-01-01T00:00:00.000Z', categories: [] }),
    makePostRow({ id: 'p2', publishedAt: '2025-03-01T00:00:00.000Z', categories: [] }),
  ];
  const bulletinRows = [BULLETIN_HEADER_ROW, makeBulletinRow({ id: 'b1', title: 'B', publishedAt: '2025-02-01T00:00:00.000Z', url: 'https://x' })];
  const getRowsFn = makeGetRowsFn({ postRows, bulletinRows });

  const page1 = await listNewsletterItems({ limit: '1', getRowsFn });
  assert.deepEqual(page1.items.map((i) => i.id), ['p2']);
  const page2 = await listNewsletterItems({ cursor: page1.nextCursor, limit: '1', getRowsFn });
  assert.deepEqual(page2.items.map((i) => i.id), ['b1']);
  const page3 = await listNewsletterItems({ cursor: page2.nextCursor, limit: '1', getRowsFn });
  assert.deepEqual(page3.items.map((i) => i.id), ['p1']);
  assert.equal(page3.hasMore, false);
  assert.equal(page3.nextCursor, null);
});

// ---- category filter ----

test('listNewsletterItems: category filter matches a post on ANY of its categories', async () => {
  const postRows = [
    POST_HEADER_ROW,
    makePostRow({ id: 'multi', publishedAt: '2025-05-07T00:00:00.000Z', categories: ['Submissions', 'Prayer of the Month'] }),
    makePostRow({ id: 'other', publishedAt: '2025-05-06T00:00:00.000Z', categories: ['Recipe'] }),
  ];
  const getRowsFn = makeGetRowsFn({ postRows });

  const submissions = await listNewsletterItems({ category: 'Submissions', getRowsFn });
  assert.deepEqual(submissions.items.map((i) => i.id), ['multi']);

  const prayer = await listNewsletterItems({ category: 'Prayer of the Month', getRowsFn });
  assert.deepEqual(prayer.items.map((i) => i.id), ['multi']);
});

test('listNewsletterItems: a specific category filter always excludes bulletins', async () => {
  const postRows = [POST_HEADER_ROW, makePostRow({ id: 'p1', publishedAt: '2025-07-01T00:00:00.000Z', categories: ['Recipe'] })];
  const bulletinRows = [BULLETIN_HEADER_ROW, makeBulletinRow({ id: '2025-07', title: 'B', publishedAt: '2025-07-07T00:00:00.000Z', url: 'https://x' })];
  const getRowsFn = makeGetRowsFn({ postRows, bulletinRows });

  const result = await listNewsletterItems({ category: 'Recipe', getRowsFn });
  assert.deepEqual(result.items.map((i) => i.type), ['post']);
});

test('listNewsletterItems: no category filter (All) includes bulletins', async () => {
  const postRows = [POST_HEADER_ROW, makePostRow({ id: 'p1', publishedAt: '2025-07-01T00:00:00.000Z', categories: ['Recipe'] })];
  const bulletinRows = [BULLETIN_HEADER_ROW, makeBulletinRow({ id: '2025-07', title: 'B', publishedAt: '2025-07-07T00:00:00.000Z', url: 'https://x' })];
  const getRowsFn = makeGetRowsFn({ postRows, bulletinRows });

  const result = await listNewsletterItems({ getRowsFn });
  assert.equal(result.items.length, 2);
});

// ---- month filter ----

test('listNewsletterItems: month filter is a UTC YYYY-MM match, applies to both posts and bulletins', async () => {
  const postRows = [
    POST_HEADER_ROW,
    makePostRow({ id: 'july', publishedAt: '2025-07-15T23:59:00.000Z', categories: [] }),
    makePostRow({ id: 'june', publishedAt: '2025-06-30T23:59:00.000Z', categories: [] }),
  ];
  const bulletinRows = [BULLETIN_HEADER_ROW, makeBulletinRow({ id: '2025-07', title: 'B', publishedAt: '2025-07-07T00:00:00.000Z', url: 'https://x' })];
  const getRowsFn = makeGetRowsFn({ postRows, bulletinRows });

  const result = await listNewsletterItems({ month: '2025-07', getRowsFn });
  assert.deepEqual(result.items.map((i) => i.id).sort(), ['2025-07', 'july']);
});

test('listNewsletterItems: month + category combine as AND', async () => {
  const postRows = [
    POST_HEADER_ROW,
    makePostRow({ id: 'match', publishedAt: '2025-07-15T00:00:00.000Z', categories: ['Recipe'] }),
    makePostRow({ id: 'wrong-month', publishedAt: '2025-06-15T00:00:00.000Z', categories: ['Recipe'] }),
    makePostRow({ id: 'wrong-category', publishedAt: '2025-07-16T00:00:00.000Z', categories: ['Exclusives'] }),
  ];
  const getRowsFn = makeGetRowsFn({ postRows });

  const result = await listNewsletterItems({ month: '2025-07', category: 'Recipe', getRowsFn });
  assert.deepEqual(result.items.map((i) => i.id), ['match']);
});

test('listNewsletterItems: a post\'s output `category` is the display label, not the raw value -- filtering still matches on the raw value', async () => {
  const postRows = [POST_HEADER_ROW, makePostRow({ id: 'p1', publishedAt: '2025-07-01T00:00:00.000Z', categories: ['Recipe'] })];
  const getRowsFn = makeGetRowsFn({ postRows });

  const result = await listNewsletterItems({ category: 'Recipe', getRowsFn });
  assert.equal(result.items.length, 1, 'filter matched on the raw "Recipe" value');
  assert.equal(result.items[0].category, 'Recipes', 'output category is the display label ("Recipes"), driving both the row and Article pills');
});

// ---- ?mode=months ----

test('listNewsletterMonths: distinct UTC months with content, newest first, unscoped by category', async () => {
  const postRows = [
    POST_HEADER_ROW,
    makePostRow({ id: 'p1', publishedAt: '2025-07-15T00:00:00.000Z', categories: ['Recipe'] }),
    makePostRow({ id: 'p2', publishedAt: '2025-07-20T00:00:00.000Z', categories: ['Exclusives'] }),
    makePostRow({ id: 'p3', publishedAt: '2024-07-11T00:00:00.000Z', categories: [] }),
  ];
  const bulletinRows = [BULLETIN_HEADER_ROW, makeBulletinRow({ id: '2025-08', title: 'B', publishedAt: '2025-08-05T00:00:00.000Z', url: 'https://x' })];
  const getRowsFn = makeGetRowsFn({ postRows, bulletinRows });

  const months = await listNewsletterMonths({ getRowsFn });
  assert.deepEqual(months, ['2025-08', '2025-07', '2024-07']);
});

// ---- ?mode=categories ----

test('listNewsletterCategories: chips ordered by count desc, display label with raw-value fallback', async () => {
  const postRows = [
    POST_HEADER_ROW,
    makePostRow({ id: 'p1', publishedAt: '2025-07-01T00:00:00.000Z', categories: ['Recipe'] }),
    makePostRow({ id: 'p2', publishedAt: '2025-07-02T00:00:00.000Z', categories: ['Recipe'] }),
    makePostRow({ id: 'p3', publishedAt: '2025-07-03T00:00:00.000Z', categories: ['Exclusives'] }),
    makePostRow({ id: 'p4', publishedAt: '2025-07-04T00:00:00.000Z', categories: ['A Brand New Category'] }),
  ];
  const getRowsFn = makeGetRowsFn({ postRows });

  const chips = await listNewsletterCategories({ getRowsFn });
  assert.deepEqual(chips, [
    { value: 'Recipe', label: 'Recipes', count: 2 },
    { value: 'Exclusives', label: 'Exclusives', count: 1 },
    { value: 'A Brand New Category', label: 'A Brand New Category', count: 1 },
  ]);
});

// ---- findNewsletterPostByUrl ----

test('findNewsletterPostByUrl: exact match returns the post with the display-label category', async () => {
  const postRows = [POST_HEADER_ROW, makePostRow({ id: 'p1', url: 'https://www.quitefrankly.tv/newsletter-content/2025/x', publishedAt: '2025-07-01T00:00:00.000Z', categories: ['Recipe'] })];
  const getRowsFn = makeGetRowsFn({ postRows });

  const post = await findNewsletterPostByUrl('https://www.quitefrankly.tv/newsletter-content/2025/x', { getRowsFn });
  assert.equal(post.id, 'p1');
  assert.equal(post.category, 'Recipes');
});

test('findNewsletterPostByUrl: no match -> null', async () => {
  const postRows = [POST_HEADER_ROW, makePostRow({ id: 'p1', url: 'https://www.quitefrankly.tv/newsletter-content/2025/x', publishedAt: '2025-07-01T00:00:00.000Z', categories: [] })];
  const getRowsFn = makeGetRowsFn({ postRows });

  const post = await findNewsletterPostByUrl('https://www.quitefrankly.tv/newsletter-content/2025/does-not-exist', { getRowsFn });
  assert.equal(post, null);
});

test('findNewsletterPostByUrl: empty url -> null without I/O', async () => {
  let called = false;
  const getRowsFn = async () => { called = true; return [POST_HEADER_ROW]; };
  const post = await findNewsletterPostByUrl('', { getRowsFn });
  assert.equal(post, null);
  assert.equal(called, false);
});

test('findNewsletterPostByUrl: never matches a bulletin', async () => {
  const bulletinRows = [BULLETIN_HEADER_ROW, makeBulletinRow({ id: '2025-07', title: 'B', publishedAt: '2025-07-07T00:00:00.000Z', url: 'https://www.quitefrankly.tv/campaigns/view-campaign/abc' })];
  const getRowsFn = makeGetRowsFn({ bulletinRows });

  const post = await findNewsletterPostByUrl('https://www.quitefrankly.tv/campaigns/view-campaign/abc', { getRowsFn });
  assert.equal(post, null);
});

// ---- getNewsletterPostById ----

test('getNewsletterPostById: success', async () => {
  const getJSONFn = async (storeName, key) => {
    assert.equal(storeName, 'newsletter-bodies');
    assert.equal(key, 'post-1');
    return { bodyHtml: '<p>hi</p>', readMinutes: 2 };
  };
  const post = await getNewsletterPostById('post-1', { getJSONFn });
  assert.deepEqual(post, { id: 'post-1', bodyHtml: '<p>hi</p>', readMinutes: 2 });
});

test('getNewsletterPostById: missing id -> null without I/O', async () => {
  let called = false;
  const getJSONFn = async () => { called = true; return null; };
  const post = await getNewsletterPostById('', { getJSONFn });
  assert.equal(post, null);
  assert.equal(called, false);
});

// ---- default handler mode selection ----

function makeReq(query) {
  return { url: `https://example.com/.netlify/functions/get-newsletter-items${query}` };
}

test('handler: id present but empty -> 400', async () => {
  const res = await handler(makeReq('?id='));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /Missing required "id"/);
});
