// Scheduled poller (Task 3) for the blog-reading feature: re-fetches the
// newest ~10 posts per collection on every run and upserts them into the
// 'blog posts' Sheet tab + 'blog-bodies' Blobs store. Deliberately NOT a
// "stop at last-cached cutoff" design -- re-fetching the newest posts every
// run (not just brand-new ones) is what catches edits to a post that was
// already cached on a previous run. Mostly orchestrates calls into
// squarespaceBlog.js/sheets.js/idempotency.js -- see those files for the
// actual fetch/parse/upsert logic, all built and reviewed in Tasks 1-2.
//
// Blob-then-row invariant (Global Constraints, post-Task-2 Blobs ruling):
// each post's normalized body is written to Blobs BEFORE its Sheet row.
// writeBlobsAndPartition (squarespaceBlog.js) is the single shared
// implementation of "skip and log a post whose blob write failed, never
// give it a Sheet row with no matching blob" -- reused directly here, same
// as the backfill script, so the two can't drift.
//
// Pagination: iterateCollectionItems (squarespaceBlog.js) already pages
// lazily -- it only fetches page 2 when the consumer asks for more items
// than page 1 contained. Breaking out of the for-await loop as soon as
// POSTS_PER_COLLECTION posts are collected means a further page is
// requested only if page 1 came up short (expected to be rare, since
// Squarespace returns 20 items/page and posts come back newest-first).
//
// No delete-detection this phase (accepted gap, logged below): a post
// unpublished/deleted on the live site lingers in the Sheet tab.
import {
  ensureBlogPostsTabExists,
  getColumnWithRows,
  appendRows,
  updateRows,
  formatColumnsAsText,
  BLOG_POSTS_TAB,
} from './lib/sheets.js';
import { partitionForUpsert } from './lib/idempotency.js';
import { setJSON } from './lib/blobs.js';
import {
  BLOG_COLLECTIONS,
  BLOG_BODIES_STORE,
  buildPostRecord,
  iterateCollectionItems,
  toBlogPostRow,
  writeBlobsAndPartition,
} from './lib/squarespaceBlog.js';

export const config = { schedule: '@daily' };

// "Newest ~10" per the brief. Squarespace's own page size (20/page,
// confirmed in Task 2) comfortably covers this in a single fetch in the
// normal case.
const POSTS_PER_COLLECTION = 10;

// Fetches and maps the newest `limit` posts for one collection, delegating
// the per-item map/normalize/compute-readMinutes/build-record sequence to
// buildPostRecord (shared with backfill-blog.mjs, so the two write paths
// can't drift). `fetchConfig` forwards test seams (fetchImpl/sleepFn/etc.)
// straight through to iterateCollectionItems -> fetchBlogListPage ->
// fetchWithBackoff, so every Squarespace request goes through the shared
// retry/backoff helper.
export async function collectRecentPosts(collection, limit, fetchConfig = {}) {
  const posts = [];
  for await (const item of iterateCollectionItems(collection, fetchConfig)) {
    const { post } = buildPostRecord(item, collection);
    posts.push(post);
    if (posts.length >= limit) break;
  }
  return posts;
}

// Does the actual poll run. Exported (rather than only the default export)
// so tests can inject `fetchConfig` (Squarespace fetch/sleep test seams) and
// `setJSONFn` (a mocked Blobs writer) without needing live Squarespace
// access or Netlify Blobs credentials -- Sheets calls are exercised via a
// global.fetch mock, same pattern sheets.test.js already established for
// Task 1's getRows/ensureTabExists tests.
export async function runPollBlog({ fetchConfig = {}, setJSONFn = setJSON } = {}) {
  await ensureBlogPostsTabExists();

  const allPosts = [];
  const perCollectionCounts = {};
  for (const collection of BLOG_COLLECTIONS) {
    const posts = await collectRecentPosts(collection, POSTS_PER_COLLECTION, fetchConfig);
    perCollectionCounts[collection] = posts.length;
    console.log(`[poll-blog] "${collection}": fetched ${posts.length} of the newest posts.`);
    allPosts.push(...posts);
  }

  console.log(`[poll-blog] Writing ${allPosts.length} blobs to "${BLOG_BODIES_STORE}" (blob first, then the matching Sheet row -- a post whose blob write fails is skipped and logged, never given a row with no matching blob)...`);
  const { writablePosts, blobFailures } = await writeBlobsAndPartition(allPosts, setJSONFn, BLOG_BODIES_STORE);
  if (blobFailures.length > 0) {
    console.error(`[poll-blog] ${blobFailures.length} post(s) had a failed blob write and were held out of the Sheet write entirely:`);
    for (const f of blobFailures) {
      console.error(`[poll-blog]   - ${f.id} "${f.title}" -- ${f.url} -- ${f.error}`);
    }
  }

  const existingRows = await getColumnWithRows(BLOG_POSTS_TAB, 'A');
  const { toInsert, toUpdate } = partitionForUpsert(existingRows, writablePosts, (p) => p.id, toBlogPostRow);
  console.log(`[poll-blog] Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

  await appendRows(BLOG_POSTS_TAB, toInsert);
  await updateRows(BLOG_POSTS_TAB, toUpdate);
  await formatColumnsAsText(BLOG_POSTS_TAB, ['A', 'E']);

  console.log('[poll-blog] Accepted gap: an unpublished/deleted post on the live site lingers in the Sheet tab -- no delete-detection this phase.');
  console.log(`[poll-blog] Done. fetched=${allPosts.length} written=${writablePosts.length} inserted=${toInsert.length} updated=${toUpdate.length} blobFailures=${blobFailures.length}`);

  return {
    perCollectionCounts,
    fetched: allPosts.length,
    written: writablePosts.length,
    inserted: toInsert.length,
    updated: toUpdate.length,
    blobFailures: blobFailures.length,
  };
}

export default async () => {
  try {
    const result = await runPollBlog();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[poll-blog] run failed:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
