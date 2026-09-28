// Unit tests for squarespaceNewsletter.js. Fixture captured from the live
// spike (2026-09-28) against /newsletter-content?format=json -- real ids,
// titles, dates, authors, categories, urls; bodies trimmed to short
// synthetic HTML (same convention as squarespaceBlog.test.js's fixtures).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  mapItemToNewsletterPost,
  buildNewsletterPostRecord,
  toNewsletterPostRow,
  displayLabelForCategory,
  CATEGORY_DISPLAY_LABELS,
  NEWSLETTER_COLLECTIONS,
  FRANK_AUTHOR_ID,
} from './squarespaceNewsletter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const page1 = JSON.parse(readFileSync(join(__dirname, '__fixtures__/squarespace-newsletter-page1.json'), 'utf8'));

const [franksFavorites, mayCrowning, hundredthConservative] = page1.items;

test('NEWSLETTER_COLLECTIONS is the single confirmed collection', () => {
  assert.deepEqual(NEWSLETTER_COLLECTIONS, ['newsletter-content']);
});

test('FRANK_AUTHOR_ID matches the account id confirmed by the spike', () => {
  assert.equal(FRANK_AUTHOR_ID, '5830d0978419c22be2442b9c');
});

// ---- displayLabelForCategory ----

test('displayLabelForCategory: mapped categories return their confirmed display label', () => {
  assert.equal(displayLabelForCategory("Frank's Favorites"), 'Direct from Frank');
  assert.equal(displayLabelForCategory('Fan Feature'), 'Fan Features');
  assert.equal(displayLabelForCategory('Recipe'), 'Recipes');
});

test('displayLabelForCategory: unmapped categories fall back to the raw value', () => {
  assert.equal(displayLabelForCategory('Submissions'), 'Submissions');
  assert.equal(displayLabelForCategory('A Brand New Category'), 'A Brand New Category');
});

test('CATEGORY_DISPLAY_LABELS only remaps the 3 confirmed cases', () => {
  assert.deepEqual(Object.keys(CATEGORY_DISPLAY_LABELS).sort(), ["Fan Feature", "Frank's Favorites", 'Recipe'].sort());
});

// ---- mapItemToNewsletterPost ----

test('mapItemToNewsletterPost: primary category is categories[0]; categories carries all of them', () => {
  const post = mapItemToNewsletterPost(mayCrowning);
  assert.equal(post.category, 'Submissions');
  assert.deepEqual(post.categories, ['Submissions', 'Prayer of the Month']);
});

test('mapItemToNewsletterPost: byline is author.displayName for a non-Frank account', () => {
  const post = mapItemToNewsletterPost(mayCrowning);
  assert.equal(post.author, 'Krista Roman');
});

test('mapItemToNewsletterPost: byline is "Quite Frankly" (not the raw account name) when authored by Frank\'s own account', () => {
  const post = mapItemToNewsletterPost(franksFavorites);
  assert.equal(post.author, 'Quite Frankly');
  const post2 = mapItemToNewsletterPost(hundredthConservative);
  assert.equal(post2.author, 'Quite Frankly', 'still overridden even though the real submitter\'s name is only in the body text, not parsed');
});

test('mapItemToNewsletterPost: publishedAt is an ISO string derived from publishOn epoch ms', () => {
  const post = mapItemToNewsletterPost(mayCrowning);
  assert.equal(post.publishedAt, '2025-05-07T16:36:13.954Z');
});

test('mapItemToNewsletterPost: url is the full site URL', () => {
  const post = mapItemToNewsletterPost(mayCrowning);
  assert.equal(post.url, 'https://www.quitefrankly.tv/newsletter-content/2025/may-crowning');
});

test('mapItemToNewsletterPost: a post with no categories gets an empty primary category, not a crash', () => {
  const post = mapItemToNewsletterPost({ ...mayCrowning, categories: undefined });
  assert.equal(post.category, '');
  assert.deepEqual(post.categories, []);
});

// ---- buildNewsletterPostRecord / toNewsletterPostRow ----

test('buildNewsletterPostRecord: normalizes the body and computes readMinutes, carries category fields through', () => {
  const { post } = buildNewsletterPostRecord(mayCrowning);
  assert.equal(post.id, mayCrowning.id);
  assert.equal(post.category, 'Submissions');
  assert.deepEqual(post.categories, ['Submissions', 'Prayer of the Month']);
  assert.ok(post.readMinutes >= 1);
  assert.ok(typeof post.bodyHtml === 'string' && post.bodyHtml.length > 0);
});

test('toNewsletterPostRow: column order matches NEWSLETTER_POSTS_HEADER, categories joined by comma', () => {
  const { post } = buildNewsletterPostRecord(mayCrowning);
  const row = toNewsletterPostRow(post);
  assert.deepEqual(row, [
    post.id,
    post.title,
    post.url,
    post.publishedAt,
    post.heroImageUrl,
    post.readMinutes,
    post.author,
    post.category,
    'Submissions,Prayer of the Month',
  ]);
});
