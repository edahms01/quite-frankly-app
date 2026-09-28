// Squarespace list-JSON mapping for the Writing -> Newsletter feature.
// Reuses squarespaceBlog.js's fetch/pagination/blob-write helpers directly
// (fetchBlogListPage/iterateCollectionItems are already collection-
// parameterized with zero blog-specific logic) -- only the item-mapping and
// row-shaping are newsletter-shaped, since they depend on category fields
// the blog collection doesn't have.
//
// Spike findings (2026-09-28, live /newsletter-content?format=json,
// paginated to the end -- 105 items, one collection):
//   - Same base item shape as the blog collections (id, title, fullUrl,
//     publishOn epoch ms, author.displayName, body, assetUrl), plus
//     `categories` (array of strings) and `tags` (array, empty on every
//     item seen -- not used).
//   - Only 1 of 105 posts has >1 category ("May Crowning":
//     ["Submissions", "Prayer of the Month"]).
//   - The Newsletter Archives page's 10 section headings are NOT always the
//     literal raw category string -- confirmed via the page's own <h2>
//     text: "Frank's Favorites" displays as "Direct from Frank", "Fan
//     Feature"/"Recipe"/"Matt's Top 5" display as their plural/ellipsis
//     forms. CATEGORY_DISPLAY_LABELS below is that confirmed map; anything
//     not in it (a future new category) falls back to the raw value, per
//     Eric's explicit call.
import { decodeEntities, normalizeBlogHtml } from './normalizeBlogHtml.js';
import { SITE_BASE_URL, computeReadMinutes } from './squarespaceBlog.js';

export { SITE_BASE_URL, PAGE_FETCH_DELAY_MS, fetchBlogListPage, iterateCollectionItems, median, computeReadMinutes, writeBlobsAndPartition, filterChangedPosts } from './squarespaceBlog.js';

export const NEWSLETTER_COLLECTIONS = ['newsletter-content'];

export const NEWSLETTER_BODIES_STORE = 'newsletter-bodies';

// Raw `categories[]` value -> the label actually shown on the live
// Newsletter Archives page. Confirmed by spike, not guessed. Eric's call:
// keep this map here (not hardcoded in the app) so get-newsletter-items.js
// is the single place a new category needs a display label added -- an
// unmapped raw value simply falls back to itself.
export const CATEGORY_DISPLAY_LABELS = {
  "Frank's Favorites": 'Direct from Frank',
  'Fan Feature': 'Fan Features',
  Recipe: 'Recipes',
};

export function displayLabelForCategory(rawCategory) {
  return CATEGORY_DISPLAY_LABELS[rawCategory] ?? rawCategory;
}

// Squarespace's own account for Frank -- confirmed via the spike (author.id
// on every sampled post attributed to Frank). Byline rule (Eric's call):
// show "Quite Frankly" instead of the raw account name for this one
// account, since some Submissions posts are filed under Frank's own
// account even when a different person wrote them (the real name, when
// different, is inline in the body text instead -- not parsed here, too
// brittle).
export const FRANK_AUTHOR_ID = '5830d0978419c22be2442b9c';
const FRANK_DISPLAY_OVERRIDE = 'Quite Frankly';

function bylineFor(author) {
  if (!author?.displayName) return '';
  const name = decodeEntities(author.displayName);
  return author.id === FRANK_AUTHOR_ID ? FRANK_DISPLAY_OVERRIDE : name;
}

// Maps a raw Squarespace newsletter item to the canonical shape the
// backfill/poller build sheet rows from. Pure, no I/O -- same split as
// squarespaceBlog.js's mapItemToPost (raw body carried through unnormalized,
// callers normalize at write time).
export function mapItemToNewsletterPost(item) {
  const assetUrl = item.assetUrl || '';
  const heroImageUrl = assetUrl.startsWith('//') ? `https:${assetUrl}` : assetUrl;
  const categories = Array.isArray(item.categories) ? item.categories : [];
  return {
    id: item.id,
    title: item.title ? decodeEntities(item.title) : '',
    url: `${SITE_BASE_URL}${item.fullUrl ?? ''}`,
    publishedAt: item.publishOn ? new Date(item.publishOn).toISOString() : '',
    heroImageUrl,
    author: bylineFor(item.author),
    // Primary category = categories[0] (Eric's call) -- '' for the
    // (unseen but possible) case of a post with no category at all.
    category: categories[0] ?? '',
    categories,
    rawBodyHtml: item.body ?? '',
  };
}

// Same map/normalize/compute-readMinutes/build-record sequence as
// squarespaceBlog.js's buildPostRecord, newsletter-shaped (category/
// categories carried onto the record; no `collection` field -- there's
// only one newsletter collection, and it's not surfaced to the app, same
// as blog's `collection` never being client-facing beyond internal use).
export function buildNewsletterPostRecord(item) {
  const mapped = mapItemToNewsletterPost(item);
  const { html: bodyHtml, videoEmbedCount } = normalizeBlogHtml(mapped.rawBodyHtml);
  return {
    post: {
      id: mapped.id,
      title: mapped.title,
      url: mapped.url,
      publishedAt: mapped.publishedAt,
      heroImageUrl: mapped.heroImageUrl,
      readMinutes: computeReadMinutes(bodyHtml),
      author: mapped.author,
      category: mapped.category,
      categories: mapped.categories,
      bodyHtml,
    },
    videoEmbedCount,
  };
}

// Builds the full row (sheets.js's NEWSLETTER_POSTS_HEADER order) for a
// fully assembled post record. `categories` is stored comma-separated
// (matches the plan's Sheet schema) -- a raw category value containing a
// literal comma has never been seen in the spike data, same "not guarded,
// not expected" posture as squarespaceBlog.js's other string fields.
export function toNewsletterPostRow(post) {
  return [
    post.id,
    post.title,
    post.url,
    post.publishedAt,
    post.heroImageUrl,
    post.readMinutes,
    post.author,
    post.category,
    post.categories.join(','),
  ];
}
