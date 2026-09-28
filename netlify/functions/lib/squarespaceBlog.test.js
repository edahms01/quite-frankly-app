import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  fetchBlogListPage,
  iterateCollectionItems,
  mapItemToPost,
  computeReadMinutes,
  toBlogPostRow,
  MAX_BODY_HTML_CHARS,
  BLOG_COLLECTIONS,
} from './squarespaceBlog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Fixtures captured from a live raw fetch of
// https://www.quitefrankly.tv/quite-frankly-originals?format=json during
// Task 2's raw-fetch investigation (2026-09-28), trimmed to 2 items per page
// (bodies truncated) to keep the fixture small while preserving the real
// field shapes/names actually observed on the site.
const page1 = JSON.parse(readFileSync(join(__dirname, '__fixtures__/squarespace-blog-page1.json'), 'utf8'));
const page2 = JSON.parse(readFileSync(join(__dirname, '__fixtures__/squarespace-blog-page2.json'), 'utf8'));

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test('BLOG_COLLECTIONS lists both collections the plan targets', () => {
  assert.deepEqual(BLOG_COLLECTIONS, ['quite-frankly-originals', 'original-articles']);
});

test('fetchBlogListPage requests format=json and omits offset on the first page', async () => {
  let requestedUrl;
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return jsonResponse(page1);
  };
  const data = await fetchBlogListPage('quite-frankly-originals', undefined, { fetchImpl });
  assert.equal(requestedUrl, 'https://www.quitefrankly.tv/quite-frankly-originals?format=json');
  assert.equal(data.items.length, 2);
});

test('fetchBlogListPage echoes the given offset back as a query param verbatim (never parsed/constructed)', async () => {
  let requestedUrl;
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return jsonResponse(page2);
  };
  await fetchBlogListPage('quite-frankly-originals', 1729890403961, { fetchImpl });
  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get('offset'), '1729890403961');
  assert.equal(url.searchParams.get('format'), 'json');
});

test('fetchBlogListPage throws with status/body on a non-ok response (after fetchWithBackoff exhausts retries)', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 500,
    headers: { get: () => null },
    text: async () => 'boom',
  });
  // 500 is retryable in fetchWithBackoff -- inject a no-op sleepFn so the
  // test doesn't actually wait through 5 real backoff delays.
  const sleepFn = async () => {};
  await assert.rejects(
    () => fetchBlogListPage('quite-frankly-originals', undefined, { fetchImpl, sleepFn }),
    /Squarespace list fetch.*500.*boom/s
  );
});

test('iterateCollectionItems pages through nextPage/nextPageOffset until nextPage is false, yielding every item in order', async () => {
  let call = 0;
  const seenUrls = [];
  const fetchImpl = async (url) => {
    seenUrls.push(url);
    call++;
    return jsonResponse(call === 1 ? page1 : page2);
  };
  const sleeps = [];
  const sleepFn = async (ms) => sleeps.push(ms);

  const items = [];
  for await (const item of iterateCollectionItems('quite-frankly-originals', { fetchImpl, sleepFn, throttleMs: 42 })) {
    items.push(item);
  }

  assert.equal(items.length, 4); // 2 from page1 + 2 from page2
  assert.equal(items[0].id, page1.items[0].id);
  assert.equal(items[2].id, page2.items[0].id);
  assert.equal(call, 2); // stopped after page2 (nextPage: false)
  assert.deepEqual(sleeps, [42]); // throttled once, between page1 and page2 -- not before page1, not after page2
  assert.ok(!seenUrls[0].includes('offset='));
  assert.ok(seenUrls[1].includes('offset=1729890403961'));
});

test('mapItemToPost extracts the confirmed real field names into the canonical post shape', () => {
  const item = page1.items[0];
  const post = mapItemToPost(item, 'quite-frankly-originals');
  assert.equal(post.id, item.id);
  assert.equal(post.collection, 'quite-frankly-originals');
  assert.equal(post.title, item.title);
  assert.equal(post.url, `https://www.quitefrankly.tv${item.fullUrl}`);
  assert.equal(post.publishedAt, new Date(item.publishOn).toISOString());
  assert.equal(post.heroImageUrl, item.assetUrl);
  assert.equal(post.author, item.author.displayName);
  assert.equal(post.rawBodyHtml, item.body);
});

test('mapItemToPost rewrites a protocol-relative assetUrl to https', () => {
  const post = mapItemToPost({ id: 'x', assetUrl: '//images.example.com/a.jpg', fullUrl: '/p', publishOn: 0 }, 'original-articles');
  assert.equal(post.heroImageUrl, 'https://images.example.com/a.jpg');
});

test('mapItemToPost falls back safely on missing assetUrl/author/title/fullUrl/publishOn', () => {
  const post = mapItemToPost({ id: 'x' }, 'original-articles');
  assert.equal(post.heroImageUrl, '');
  assert.equal(post.author, '');
  assert.equal(post.title, '');
  assert.equal(post.publishedAt, '');
  assert.equal(post.url, 'https://www.quitefrankly.tv');
  assert.equal(post.rawBodyHtml, '');
});

test('computeReadMinutes: word count / 200, ceiled, floor of 1', () => {
  assert.equal(computeReadMinutes(''), 1);
  assert.equal(computeReadMinutes('<p>only a few words here</p>'), 1);
  const twoHundredWords = `<p>${Array(200).fill('word').join(' ')}</p>`;
  assert.equal(computeReadMinutes(twoHundredWords), 1);
  const twoHundredOneWords = `<p>${Array(201).fill('word').join(' ')}</p>`;
  assert.equal(computeReadMinutes(twoHundredOneWords), 2);
  const sixHundredWords = `<p>${Array(600).fill('word').join(' ')}</p>`;
  assert.equal(computeReadMinutes(sixHundredWords), 3);
});

test('computeReadMinutes strips tags before counting so markup never inflates the word count', () => {
  const html = '<div class="sqs-layout"><p>one two three</p><img src="x.jpg"></div>';
  assert.equal(computeReadMinutes(html), 1);
});

test('toBlogPostRow builds the 9-column A-I row in sheets.js BLOG_POSTS_HEADER order', () => {
  const post = {
    id: 'abc123',
    collection: 'quite-frankly-originals',
    title: 'A Title',
    url: 'https://www.quitefrankly.tv/quite-frankly-originals/a-title',
    publishedAt: '2026-01-01T00:00:00.000Z',
    heroImageUrl: 'https://images.example.com/a.jpg',
    readMinutes: 3,
    author: 'Frankie Val',
    bodyHtml: '<p>body</p>',
  };
  assert.deepEqual(toBlogPostRow(post), [
    'abc123',
    'quite-frankly-originals',
    'A Title',
    'https://www.quitefrankly.tv/quite-frankly-originals/a-title',
    '2026-01-01T00:00:00.000Z',
    'https://images.example.com/a.jpg',
    3,
    'Frankie Val',
    '<p>body</p>',
  ]);
});

test('MAX_BODY_HTML_CHARS matches the Global Constraints ~45k guard threshold', () => {
  assert.equal(MAX_BODY_HTML_CHARS, 45000);
});
