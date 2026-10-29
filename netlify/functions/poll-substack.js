// Scheduled poller for the Writing > Substack tab. Every run: fetch feed +
// archive, join, write changed posts to Blobs, push for brand-new recent
// posts. Storage is Netlify Blobs only (no Sheet tab):
//   - `substack-posts`/`posts`  metadata list, newest first, merged by id
//   - `substack-bodies`/<id>    { bodyHtml, readMinutes }, free posts only
//
// Order of operations (so a failure never causes a duplicate or lost push):
//   1. fetch feed + archive; either failing aborts the run and writes nothing
//      (logged with console.error). A post with unknown audience is never
//      written.
//   2. read the stored list. A READ ERROR aborts; a missing key (null) is the
//      first run and seeds silently (no push) -- an empty/failed read must
//      never be mistaken for "store is empty", or every old post would push.
//   3. body blobs first, then ONE list write. A post whose body write fails
//      is held out of the list and retried next run.
//   4. only after the list is persisted, push for posts new to the store AND
//      published in the last 48h (selectPushPosts). Push is its own
//      try/catch, same as poll-youtube.js: it can never fail the poll.
// Accepted gap (same as Blog): a post deleted on Substack lingers.
import { getJSON, setJSON, deleteKey } from './lib/blobs.js';
import { getTokensForPreference, sendExpoPushBatch } from './lib/push.js';
import { sanitizeDescription } from '../../src/lib/sanitizeDescription.js';
import {
  SUBSTACK_POSTS_STORE,
  SUBSTACK_POSTS_KEY,
  SUBSTACK_BODIES_STORE,
  fetchFeedXml,
  fetchArchive,
  parseFeed,
  joinFeedAndArchive,
  planPost,
  toListEntry,
  mergeById,
  selectPushPosts,
} from './lib/substack.js';

// Every 6 hours. Netlify reads `config.schedule` statically, so the literal
// below must stay a literal; this named constant sits next to it and a test
// asserts the two match.
export const POLL_SCHEDULE = '0 */6 * * *';
export const config = { schedule: '0 */6 * * *' };

const SCHEDULED_FUNCTION_TIME_LIMIT_MS = 30_000;
// Same 22s guard as poll-blog.js: posts not started in time are left for the
// next run (they are simply not in the list yet, so they retry).
const POLLER_TIME_GUARD_MS = 22_000;

const PUSH_TITLE = 'New from Frank on Substack';

export async function runPollSubstack({
  fetchConfig = {},
  getJSONFn = getJSON,
  setJSONFn = setJSON,
  deleteFn = deleteKey,
  getTokensFn = getTokensForPreference,
  sendPushFn = sendExpoPushBatch,
  now = Date.now,
  dryRun = false,
} = {}) {
  const startedAt = now();

  let feedXml;
  let archive;
  try {
    [feedXml, archive] = await Promise.all([fetchFeedXml(fetchConfig), fetchArchive(fetchConfig)]);
  } catch (err) {
    console.error('[poll-substack] Feed or archive fetch failed -- aborting, nothing written:', err.message);
    throw err;
  }

  const { records, skippedFeedOnly } = joinFeedAndArchive(parseFeed(feedXml), archive);
  if (skippedFeedOnly.length > 0) {
    console.error(`[poll-substack] ${skippedFeedOnly.length} feed post(s) not in the archive (audience unknown) -- skipped this run: ${skippedFeedOnly.map((f) => f.slug).join(', ')}`);
  }

  // Throws on a read error (abort). null = first run.
  const stored = await getJSONFn(SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY, null);
  if (stored !== null && !Array.isArray(stored)) {
    throw new Error(`Stored "${SUBSTACK_POSTS_KEY}" list is not an array -- aborting rather than overwrite it.`);
  }
  const isSeed = stored === null;
  const existingById = new Map((stored ?? []).map((e) => [e.id, e]));

  const planned = records.map((record) => ({ record, plan: planPost(record, existingById.get(record.id)) }));
  const changed = planned.filter(({ plan }) => plan.changed);
  const unchangedCount = planned.length - changed.length;

  const written = []; // { record, plan } whose body (if any) is safely stored
  const deferred = [];
  const bodyFailures = [];
  for (const item of changed) {
    if (now() - startedAt >= POLLER_TIME_GUARD_MS) {
      deferred.push(item.record.id);
      continue;
    }
    const { record, plan } = item;
    try {
      if (!dryRun) {
        if (plan.bodyChanged) {
          // Body first, list second.
          await setJSONFn(SUBSTACK_BODIES_STORE, record.id, { bodyHtml: record.bodyHtml, readMinutes: record.readMinutes });
        } else if (plan.dropBody) {
          await deleteFn(SUBSTACK_BODIES_STORE, record.id); // went paid: keep no body
        }
      }
      written.push(item);
    } catch (err) {
      bodyFailures.push(record.id);
      console.error(`[poll-substack] Body write failed for ${record.id} "${record.title}" -- held out of the list, retried next run:`, err.message);
    }
  }
  if (deferred.length > 0) {
    console.warn(`[poll-substack] Time guard tripped -- ${deferred.length} post(s) NOT started this run, picked up next run: ${deferred.join(', ')}`);
  }

  const entries = written.map(({ record, plan }) => toListEntry(record, plan));
  const nextList = mergeById(stored ?? [], entries);
  // A first run always writes (even an empty list) so the key exists and the
  // next post counts as new.
  if (!dryRun && (isSeed || entries.length > 0)) {
    await setJSONFn(SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY, nextList);
  }

  const newPosts = written.filter(({ plan }) => plan.isNew).map(({ record }) => record);
  const toPush = selectPushPosts(newPosts, { isSeed, now: now() });
  let pushed = 0;
  if (!dryRun && toPush.length > 0) {
    try {
      const tokens = await getTokensFn('substack');
      for (const post of toPush) {
        const result = await sendPushFn(tokens, { title: PUSH_TITLE, body: sanitizeDescription(post.title) || 'Read now' });
        pushed += result?.sent ?? 0;
      }
    } catch (err) {
      console.error('[poll-substack] Push notification step failed for new Substack posts', err);
    }
  }

  const durationMs = now() - startedAt;
  const limitFraction = ((durationMs / SCHEDULED_FUNCTION_TIME_LIMIT_MS) * 100).toFixed(1);
  console.log(`[poll-substack] Done in ${durationMs}ms (${limitFraction}% of the ${SCHEDULED_FUNCTION_TIME_LIMIT_MS}ms limit). dryRun=${dryRun} seed=${isSeed} fetched=${records.length} unchanged=${unchangedCount} written=${written.length} new=${newPosts.length} pushPosts=${toPush.length} pushed=${pushed} bodyFailures=${bodyFailures.length} deferred=${deferred.length}`);

  return {
    dryRun,
    seed: isSeed,
    fetched: records.length,
    unchanged: unchangedCount,
    written: written.length,
    newPosts: newPosts.length,
    pushPosts: toPush.map((p) => p.id),
    pushed,
    bodyFailures: bodyFailures.length,
    deferred: deferred.length,
    durationMs,
    // dry-run inspection only: what would be written
    ...(dryRun ? { wouldWrite: written.map(({ record, plan }) => ({ ...record, plan })), wouldPush: toPush } : {}),
  };
}

export default async () => {
  try {
    const result = await runPollSubstack();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[poll-substack] run failed:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
