// Scheduled poller (Task 3) for the blog-reading feature: re-fetches the
// newest POSTS_PER_COLLECTION posts per collection on every run and upserts
// them into the 'blog posts' Sheet tab + 'blog-bodies' Blobs store, skipping
// any post whose normalized content hasn't actually changed since the last
// run (filterChangedPosts). Deliberately NOT a
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
//
// Runtime fix pass (2026-09-28): collections fetch concurrently
// (Promise.all, see runPollBlog) rather than sequentially, with a shorter
// poller-only page-fetch throttle (POLLER_PAGE_THROTTLE_MS); the Sheet
// column-A read + append/update/format calls are skipped entirely on a run
// with nothing to write (the common case); and a ~22s time guard
// (POLLER_TIME_GUARD_MS/timeBoxPosts) defers any changed post not started
// in time to the next run, so a slow run degrades to "did less, logged
// what's left" instead of risking a mid-write kill at Netlify's 30s limit.
import {
  ensureBlogPostsTabExists,
  getColumnWithRows,
  appendRows,
  updateRows,
  formatColumnsAsText,
  BLOG_POSTS_TAB,
} from './lib/sheets.js';
import { partitionForUpsert } from './lib/idempotency.js';
import { getJSON, setJSON } from './lib/blobs.js';
import {
  BLOG_COLLECTIONS,
  BLOG_BODIES_STORE,
  buildPostRecord,
  filterChangedPosts,
  iterateCollectionItems,
  toBlogPostRow,
  writeBlobsAndPartition,
} from './lib/squarespaceBlog.js';

export const config = { schedule: '@daily' };

// Netlify Scheduled Functions have a hard 30-second execution limit
// (docs.netlify.com/build/functions/scheduled-functions -- "Scheduled
// functions have a 30 second execution limit"). runPollBlog logs its own
// elapsed time against this on every run so a slow run shows up in the
// function's own logs, not just as a mysterious timeout.
const SCHEDULED_FUNCTION_TIME_LIMIT_MS = 30_000;

// Newest posts re-checked per collection, every run. Kept small (3, not the
// original "~10") since this poller runs daily and re-fetches the newest N
// unconditionally to catch edits -- a smaller N means less Squarespace
// traffic and less exposure to the 30s scheduled-function limit above,
// while still comfortably covering how often Frank publishes.
const POSTS_PER_COLLECTION = 3;

// Delay between successive list-page fetches, poller-only (2026-09-28
// runtime-fix pass). squarespaceBlog.js's own default (PAGE_FETCH_DELAY_MS,
// 300ms) is tuned for the backfill script, which makes many sequential page
// requests across a collection's full history -- a real "don't hammer
// Squarespace" concern there. The poller only ever fetches page 1 for each
// collection in the overwhelmingly common case (POSTS_PER_COLLECTION=3 is
// far below page 1's 20-item size), so that delay is almost never even
// incurred; when it is (page 1 came up short), a shorter delay is fine
// since it's at most one extra page, once, for a poller that already runs
// daily.
const POLLER_PAGE_THROTTLE_MS = 100;

// Scheduled Functions get hard-killed at SCHEDULED_FUNCTION_TIME_LIMIT_MS
// with no chance to finish in-flight work or log a clean summary. This
// guard is checked before starting each changed post's blob write; once
// elapsed time crosses it, remaining posts are left unwritten (safe -- they
// still have whatever blob/row they had before, or none if genuinely new)
// and logged by id, to be picked up on the very next scheduled run rather
// than risking a mid-write kill. 22s leaves an ~8s margin under the 30s
// limit for the Sheet upsert write + formatColumnsAsText that still need to
// run afterward for whatever did make it into writablePosts.
const POLLER_TIME_GUARD_MS = 22_000;

// Splits `posts` into those startable before the time guard trips and those
// left for next run. Checked once per post (not mid-post) -- a single
// post's own blob write is never interrupted partway. Exported for tests.
export function timeBoxPosts(posts, startedAt, now, guardMs = POLLER_TIME_GUARD_MS) {
  const inBudget = [];
  const deferred = [];
  for (const post of posts) {
    if (now() - startedAt >= guardMs) {
      deferred.push(post);
    } else {
      inBudget.push(post);
    }
  }
  return { inBudget, deferred };
}

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
export async function runPollBlog({ fetchConfig = {}, setJSONFn = setJSON, getJSONFn = getJSON, now = Date.now } = {}) {
  const startedAt = now();
  await ensureBlogPostsTabExists();

  // Collections are independent Squarespace fetches (different URLs, no
  // shared state) -- run them concurrently rather than one-after-another.
  // Poller-only throttle override (see POLLER_PAGE_THROTTLE_MS) applies to
  // both; the backfill script is untouched (still calls with no override,
  // keeping squarespaceBlog.js's 300ms default for its own long sequential
  // pagination runs).
  const pollerFetchConfig = { throttleMs: POLLER_PAGE_THROTTLE_MS, ...fetchConfig };
  const perCollectionPosts = await Promise.all(
    BLOG_COLLECTIONS.map((collection) => collectRecentPosts(collection, POSTS_PER_COLLECTION, pollerFetchConfig))
  );

  const allPosts = [];
  const perCollectionCounts = {};
  BLOG_COLLECTIONS.forEach((collection, i) => {
    const posts = perCollectionPosts[i];
    perCollectionCounts[collection] = posts.length;
    console.log(`[poll-blog] "${collection}": fetched ${posts.length} of the newest posts.`);
    allPosts.push(...posts);
  });

  const { changed, unchangedCount } = await filterChangedPosts(allPosts, getJSONFn, BLOG_BODIES_STORE);
  if (unchangedCount > 0) {
    console.log(`[poll-blog] ${unchangedCount} post(s) unchanged since the last run -- skipping their blob + Sheet-row write.`);
  }

  const { inBudget, deferred } = timeBoxPosts(changed, startedAt, now);
  if (deferred.length > 0) {
    console.warn(`[poll-blog] Time guard tripped at ${now() - startedAt}ms (limit ${POLLER_TIME_GUARD_MS}ms) -- ${deferred.length} changed post(s) NOT started this run, picked up next run: ${deferred.map((p) => p.id).join(', ')}`);
  }

  console.log(`[poll-blog] Writing ${inBudget.length} blobs to "${BLOG_BODIES_STORE}" (blob first, then the matching Sheet row -- a post whose blob write fails is skipped and logged, never given a row with no matching blob)...`);
  const { writablePosts, blobFailures } = await writeBlobsAndPartition(inBudget, setJSONFn, BLOG_BODIES_STORE);
  if (blobFailures.length > 0) {
    console.error(`[poll-blog] ${blobFailures.length} post(s) had a failed blob write and were held out of the Sheet write entirely:`);
    for (const f of blobFailures) {
      console.error(`[poll-blog]   - ${f.id} "${f.title}" -- ${f.url} -- ${f.error}`);
    }
  }

  // Skip the full-tab column-A read and the append/update/format calls
  // entirely when there's nothing to write -- the common case on most
  // days, since this poller only re-checks POSTS_PER_COLLECTION newest
  // posts per collection and most of those are usually unchanged. Reading
  // and rewriting a metadata-format pass over a Sheet tab for zero actual
  // row changes was pure overhead.
  let toInsert = [];
  let toUpdate = [];
  if (writablePosts.length > 0) {
    const existingRows = await getColumnWithRows(BLOG_POSTS_TAB, 'A');
    ({ toInsert, toUpdate } = partitionForUpsert(existingRows, writablePosts, (p) => p.id, toBlogPostRow));
    console.log(`[poll-blog] Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

    await appendRows(BLOG_POSTS_TAB, toInsert);
    await updateRows(BLOG_POSTS_TAB, toUpdate);
    await formatColumnsAsText(BLOG_POSTS_TAB, ['A', 'E']);
  } else {
    console.log('[poll-blog] Nothing to write this run -- skipping the Sheet column-A read and the append/update/format calls entirely.');
  }

  console.log('[poll-blog] Accepted gap: an unpublished/deleted post on the live site lingers in the Sheet tab -- no delete-detection this phase.');

  const durationMs = now() - startedAt;
  const limitFraction = ((durationMs / SCHEDULED_FUNCTION_TIME_LIMIT_MS) * 100).toFixed(1);
  console.log(`[poll-blog] Done in ${durationMs}ms (${limitFraction}% of the ${SCHEDULED_FUNCTION_TIME_LIMIT_MS}ms scheduled-function limit). fetched=${allPosts.length} unchanged=${unchangedCount} written=${writablePosts.length} inserted=${toInsert.length} updated=${toUpdate.length} blobFailures=${blobFailures.length}`);

  return {
    perCollectionCounts,
    fetched: allPosts.length,
    unchanged: unchangedCount,
    written: writablePosts.length,
    inserted: toInsert.length,
    updated: toUpdate.length,
    blobFailures: blobFailures.length,
    durationMs,
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
