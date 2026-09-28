// Scheduled poller for the Writing -> Newsletter feature. Structurally
// identical to poll-blog.js (re-fetch newest POSTS_PER_COLLECTION every
// run, skip unchanged via filterChangedPosts, blob-then-row invariant via
// writeBlobsAndPartition, ~22s time guard) -- posts only, one collection.
// Bulletins have no poller (Eric's call): they're seeded once and
// maintained by hand, the app never fetches a campaign page.
//
// Scheduled an hour after poll-blog's @daily (Eric's addition) so the two
// don't hit the Sheets API at the same moment.
import { ensureNewsletterPostsTabExists, getColumnWithRows, appendRows, updateRows, formatColumnsAsText, NEWSLETTER_POSTS_TAB } from './lib/sheets.js';
import { partitionForUpsert } from './lib/idempotency.js';
import { getJSON, setJSON } from './lib/blobs.js';
import {
  NEWSLETTER_COLLECTIONS,
  NEWSLETTER_BODIES_STORE,
  buildNewsletterPostRecord,
  filterChangedPosts,
  iterateCollectionItems,
  toNewsletterPostRow,
  writeBlobsAndPartition,
} from './lib/squarespaceNewsletter.js';

export const config = { schedule: '0 1 * * *' };

const SCHEDULED_FUNCTION_TIME_LIMIT_MS = 30_000;
const POSTS_PER_COLLECTION = 3;
const POLLER_PAGE_THROTTLE_MS = 100;
const POLLER_TIME_GUARD_MS = 22_000;

// Identical shape to poll-blog.js's timeBoxPosts -- a local, structurally-
// duplicated copy rather than a shared import (it's a private helper in
// each poller, not exported from a shared lib), same as the plan's Reuse
// rule for small private helpers.
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

export async function collectRecentPosts(collection, limit, fetchConfig = {}) {
  const posts = [];
  for await (const item of iterateCollectionItems(collection, fetchConfig)) {
    const { post } = buildNewsletterPostRecord(item);
    posts.push(post);
    if (posts.length >= limit) break;
  }
  return posts;
}

export async function runPollNewsletter({ fetchConfig = {}, setJSONFn = setJSON, getJSONFn = getJSON, now = Date.now } = {}) {
  const startedAt = now();
  await ensureNewsletterPostsTabExists();

  const pollerFetchConfig = { throttleMs: POLLER_PAGE_THROTTLE_MS, ...fetchConfig };
  const perCollectionPosts = await Promise.all(
    NEWSLETTER_COLLECTIONS.map((collection) => collectRecentPosts(collection, POSTS_PER_COLLECTION, pollerFetchConfig))
  );

  const allPosts = [];
  const perCollectionCounts = {};
  NEWSLETTER_COLLECTIONS.forEach((collection, i) => {
    const posts = perCollectionPosts[i];
    perCollectionCounts[collection] = posts.length;
    console.log(`[poll-newsletter] "${collection}": fetched ${posts.length} of the newest posts.`);
    allPosts.push(...posts);
  });

  const { changed, unchangedCount } = await filterChangedPosts(allPosts, getJSONFn, NEWSLETTER_BODIES_STORE);
  if (unchangedCount > 0) {
    console.log(`[poll-newsletter] ${unchangedCount} post(s) unchanged since the last run -- skipping their blob + Sheet-row write.`);
  }

  const { inBudget, deferred } = timeBoxPosts(changed, startedAt, now);
  if (deferred.length > 0) {
    console.warn(`[poll-newsletter] Time guard tripped at ${now() - startedAt}ms (limit ${POLLER_TIME_GUARD_MS}ms) -- ${deferred.length} changed post(s) NOT started this run, picked up next run: ${deferred.map((p) => p.id).join(', ')}`);
  }

  console.log(`[poll-newsletter] Writing ${inBudget.length} blobs to "${NEWSLETTER_BODIES_STORE}" (blob first, then the matching Sheet row)...`);
  const { writablePosts, blobFailures } = await writeBlobsAndPartition(inBudget, setJSONFn, NEWSLETTER_BODIES_STORE);
  if (blobFailures.length > 0) {
    console.error(`[poll-newsletter] ${blobFailures.length} post(s) had a failed blob write and were held out of the Sheet write entirely:`);
    for (const f of blobFailures) {
      console.error(`[poll-newsletter]   - ${f.id} "${f.title}" -- ${f.url} -- ${f.error}`);
    }
  }

  let toInsert = [];
  let toUpdate = [];
  if (writablePosts.length > 0) {
    const existingRows = await getColumnWithRows(NEWSLETTER_POSTS_TAB, 'A');
    ({ toInsert, toUpdate } = partitionForUpsert(existingRows, writablePosts, (p) => p.id, toNewsletterPostRow));
    console.log(`[poll-newsletter] Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

    await appendRows(NEWSLETTER_POSTS_TAB, toInsert);
    await updateRows(NEWSLETTER_POSTS_TAB, toUpdate);
    await formatColumnsAsText(NEWSLETTER_POSTS_TAB, ['A', 'D']);
  } else {
    console.log('[poll-newsletter] Nothing to write this run -- skipping the Sheet column-A read and the append/update/format calls entirely.');
  }

  const durationMs = now() - startedAt;
  const limitFraction = ((durationMs / SCHEDULED_FUNCTION_TIME_LIMIT_MS) * 100).toFixed(1);
  console.log(`[poll-newsletter] Done in ${durationMs}ms (${limitFraction}% of the ${SCHEDULED_FUNCTION_TIME_LIMIT_MS}ms scheduled-function limit). fetched=${allPosts.length} unchanged=${unchangedCount} written=${writablePosts.length} inserted=${toInsert.length} updated=${toUpdate.length} blobFailures=${blobFailures.length}`);

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
    const result = await runPollNewsletter();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[poll-newsletter] run failed:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
