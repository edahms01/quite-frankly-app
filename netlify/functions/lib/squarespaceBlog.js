// Squarespace list-JSON fetch/parse for the blog-reading feature. Shared by
// the one-time backfill script (Task 2) and the incremental poller (Task 3)
// -- implemented once, imported twice, same as fetchWithBackoff/normalizeBlogHtml.
//
// Raw-fetch investigation (Task 2, 2026-09-28) against the real site resolved
// the plan's open question about field names / two-tier fetch:
//   - Confirmed field names: `id`, `title`, `urlId`, `fullUrl` (leading-slash
//     relative path, e.g. "/quite-frankly-originals/some-slug"), `publishOn`
//     (epoch milliseconds, NOT an ISO string), `assetUrl` (hero image, full
//     CDN URL already -- not protocol-relative in every sample seen, but
//     rewritten defensively anyway), `author` (an object; `.displayName` is
//     the field to use), `body` (full post HTML).
//   - Pagination is `pagination.nextPage` (bool) + `pagination.nextPageOffset`
//     (opaque, an integer in practice) + `pagination.nextPageUrl` (a
//     ready-made relative URL with the offset already applied). This script
//     treats nextPageOffset as opaque and echoes it back as the `offset`
//     query param, same "never construct/parse a cursor" discipline as the
//     Global Constraints call for on the app-facing composite cursor
//     (a different, unrelated cursor -- this one is Squarespace's own).
//   - The list JSON's `items[].body` IS the full post body HTML, not an
//     excerpt (`excerpt` is a separate, shorter field) -- confirmed across
//     all 20 items on `quite-frankly-originals` page 1 (body lengths ranging
//     11,109-137,365 chars) and the first page of `original-articles`. No
//     per-item `?format=json` fetch is needed or performed.
import { fetchWithBackoff } from './fetchWithBackoff.js';

export const SITE_BASE_URL = 'https://www.quitefrankly.tv';

export const BLOG_COLLECTIONS = ['quite-frankly-originals', 'original-articles'];

// Dedicated Blobs store name for post body content, keyed by Squarespace
// post id. Exported here (rather than left as a private const in the
// backfill script) so the backfill script and the poller (Task 3) can both
// import the identical value instead of risking drift between two
// hand-typed copies of the same string.
export const BLOG_BODIES_STORE = 'blog-bodies';

// Delay between successive list-page fetches within one collection, on top
// of fetchWithBackoff's own per-request retry/backoff -- keeps a full
// backfill's pagination from hammering Squarespace back-to-back.
export const PAGE_FETCH_DELAY_MS = 300;

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetches one page of a collection's list JSON. `offset` is the opaque
// pagination.nextPageOffset value Squarespace itself returned on a previous
// page -- omit for the first page. `config` forwards test seams
// (fetchImpl/sleepFn/etc.) straight through to fetchWithBackoff.
export async function fetchBlogListPage(collection, offset, config = {}) {
  const url = new URL(`${SITE_BASE_URL}/${collection}`);
  url.searchParams.set('format', 'json');
  if (offset !== undefined && offset !== null) {
    url.searchParams.set('offset', String(offset));
  }
  const response = await fetchWithBackoff(url.toString(), {}, config);
  if (!response.ok) {
    throw new Error(`Squarespace list fetch for "${collection}" failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// Pages through an entire collection, yielding raw Squarespace item objects
// in the site's own order (newest publishOn first, confirmed against the
// live site). Throttled by PAGE_FETCH_DELAY_MS between page requests
// (config.throttleMs overrides; config.sleepFn overrides the timer, for
// tests). config.fetchImpl/other fetchWithBackoff knobs are forwarded to
// every page fetch.
export async function* iterateCollectionItems(collection, config = {}) {
  const { throttleMs = PAGE_FETCH_DELAY_MS, sleepFn = defaultSleep, ...fetchConfig } = config;
  let offset;
  let first = true;
  do {
    if (!first) await sleepFn(throttleMs);
    first = false;
    const page = await fetchBlogListPage(collection, offset, fetchConfig);
    for (const item of page.items ?? []) {
      yield item;
    }
    offset = page.pagination?.nextPage ? page.pagination.nextPageOffset : undefined;
  } while (offset !== undefined && offset !== null);
}

// Maps a raw Squarespace list-item object to the canonical shape the
// backfill/poller build sheet rows from. Pure, no I/O. `rawBodyHtml` is
// intentionally NOT normalized here -- callers run it through
// normalizeBlogHtml (Task 1) themselves, since normalizing is a write-time
// decision each caller makes explicitly (the backfill also needs the raw
// body's collection-level stats before it decides to normalize).
export function mapItemToPost(item, collection) {
  const assetUrl = item.assetUrl || '';
  const heroImageUrl = assetUrl.startsWith('//') ? `https:${assetUrl}` : assetUrl;
  return {
    id: item.id,
    collection,
    title: item.title ?? '',
    url: `${SITE_BASE_URL}${item.fullUrl ?? ''}`,
    publishedAt: item.publishOn ? new Date(item.publishOn).toISOString() : '',
    heroImageUrl,
    author: item.author?.displayName ?? '',
    rawBodyHtml: item.body ?? '',
  };
}

// Median of a numeric array. Pure. Used for the backfill/poller's
// render-performance-signal reporting (max/median normalized bodyHtml
// length per collection) -- purely informational since the Blobs ruling
// removed the Sheet-cell size guard, but still worth surfacing. Returns 0
// for an empty array rather than NaN.
export function median(numbers) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Word-count-based read time, exact spec from the plan: strip tags, collapse
// whitespace, count words, ceil(words / 200), floor of 1 minute. Pure.
// Applied to the NORMALIZED bodyHtml (post-normalizeBlogHtml), not the raw
// Squarespace body -- callers are responsible for that ordering.
export function computeReadMinutes(bodyHtml) {
  const text = (bodyHtml || '').replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.ceil(words.length / 200));
}

// Writes each post's normalized bodyHtml (+ readMinutes) to a Blobs store,
// keyed by post id, and splits posts into those whose blob write succeeded
// vs. failed. This is the single load-bearing invariant of the post-Task-2
// Blobs ruling: "blob first, then the Sheet row -- if the blob write fails,
// skip that row and log it, never write a row with no matching blob"
// (Global Constraints). Extracted here (rather than left inline in the
// backfill script's main()) so it's unit-testable with a mocked
// `setJSONFn`, and so the backfill and the poller (Task 3, same
// blob-then-row/skip-and-log rule) share one implementation instead of
// risking drift between two copies.
//
// `setJSONFn` matches blobs.js's `setJSON(storeName, key, value)` signature
// -- injected (rather than imported directly) purely as a test seam; real
// callers pass the real `setJSON`. Returns `{ writablePosts, blobFailures }`
// in the candidates' original order; `blobFailures` entries carry
// `{ id, title, url, error }` for reporting. Never throws itself -- a
// per-post failure is caught and recorded, not propagated, so one bad post
// can't abort the whole run.
export async function writeBlobsAndPartition(posts, setJSONFn, storeName) {
  const writablePosts = [];
  const blobFailures = [];
  for (const post of posts) {
    try {
      await setJSONFn(storeName, post.id, { bodyHtml: post.bodyHtml, readMinutes: post.readMinutes });
      writablePosts.push(post);
    } catch (err) {
      blobFailures.push({ id: post.id, title: post.title, url: post.url, error: err.message });
    }
  }
  return { writablePosts, blobFailures };
}

// Builds the full A-H row (sheets.js's BLOG_POSTS_HEADER order -- the
// 'blog posts' tab is metadata-only as of the post-Task-2 Blobs ruling, no
// bodyHtml column) for a fully assembled post record: { id, collection,
// title, url, publishedAt, heroImageUrl, readMinutes, author }. `post` may
// still carry a `bodyHtml` property (callers need it to write the matching
// blob) -- this function simply doesn't include it in the row, since body
// content now lives in Netlify Blobs, keyed by `id`, not in the Sheet.
// Shared by insert and update paths so they can't drift.
export function toBlogPostRow(post) {
  return [
    post.id,
    post.collection,
    post.title,
    post.url,
    post.publishedAt,
    post.heroImageUrl,
    post.readMinutes,
    post.author,
  ];
}
