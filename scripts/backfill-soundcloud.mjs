// One-off backfill of the show's full SoundCloud audio history into the
// 'audio history' Google Sheet tab and the qf-soundcloud-cache blob store.
//
// Existing rows only have A-E populated, and D (Resolved URL) is currently
// a confirmed bug — every row holds the constant feed URL instead of a real
// per-episode resolved URL. This backfill fetches accurate per-episode
// resolved URLs and track IDs and back-fills D/F/G/H/I/L for every existing
// row, while inserting any episodes missing from the sheet entirely.
//
// Column F (SoundCloud Track ID) is a NEW dedupe key going forward, but it
// is empty on every pre-existing row today. For this one migration pass,
// "already in the sheet" vs. "brand new" is decided by column C (Audio File
// URL, the OLD key) instead — see the live-run section of main() below.
//
// Run with all Netlify env vars injected:
//   netlify dev:exec -- node scripts/backfill-soundcloud.mjs --dry-run   (read-only report, no writes)
//   netlify dev:exec -- node scripts/backfill-soundcloud.mjs             (live upsert + cache write)
//
// The live run only happens after a human has reviewed the dry-run report.

import { XMLParser } from 'fast-xml-parser';
import { appendRows, getColumn, getColumnWithRows, updateRows } from '../netlify/functions/lib/sheets.js';
import { partitionForUpsert } from '../netlify/functions/lib/idempotency.js';
import { normalizeEntry, extractTrackId, resolveEpisodeUrl, mergeEpisodesByGuid } from '../netlify/functions/lib/soundcloud.js';
import { secondsToTimestamp } from '../netlify/functions/lib/duration.js';
import { getJSON, setJSON } from '../netlify/functions/lib/blobs.js';

const FEED_URL = process.env.SOUNDCLOUD_RSS_URL;
if (!FEED_URL) {
  console.error('Missing required env var: SOUNDCLOUD_RSS_URL');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const SHEET_TAB = 'audio history';
const BLOB_STORE = 'qf-soundcloud-cache';
const BLOB_KEY = 'episodes';

// resolveEpisodeUrl makes a real HTTP call (HEAD, one redirect hop) per
// episode, so resolution is batched rather than fired unbounded across the
// whole show history.
const RESOLVE_BATCH_SIZE = 10;
const RESOLVE_BATCH_DELAY_MS = 200;

// Same parser config as poll-soundcloud.js — confirmed by reading that file.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
});

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Some feed providers honor a count query param; if not, this just fetches
// the default response, and main() logs the actual item count it got so a
// lower-than-expected cap is visible rather than silently truncating.
function buildFeedUrl(base) {
  try {
    const url = new URL(base);
    url.searchParams.set('limit', '500');
    return url.toString();
  } catch {
    return base;
  }
}

// Concurrency-capped URL resolution: batches of ~10 in parallel via
// Promise.all, with a short delay between batches. Not a bare sequential
// for-await loop, and not an unbounded Promise.all over the whole show
// history — resolveEpisodeUrl hits a real HTTP endpoint (chrt.fm) per item.
async function resolveAllUrls(urls) {
  const results = new Array(urls.length);
  const batches = chunk(urls, RESOLVE_BATCH_SIZE);
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const batchResults = await Promise.all(batch.map((url) => resolveEpisodeUrl(url)));
    for (let i = 0; i < batch.length; i++) {
      results[b * RESOLVE_BATCH_SIZE + i] = batchResults[i];
    }
    if (b < batches.length - 1) {
      await sleep(RESOLVE_BATCH_DELAY_MS);
    }
  }
  return results;
}

// Builds the full A-L row for an episode. Shared by both the insert and
// update paths so the two can never drift out of sync with each other.
// durationSeconds falls back to 0 here only — normalizeEntry legitimately
// returns null for "no itunes:duration tag" so it isn't confused with a
// genuine zero-length episode elsewhere in the app (e.g. Listen.js), but
// the Sheet has no null representation for a numeric cell.
function toAudioRow(item) {
  return [
    item.title,
    item.publishedAt,
    item.audioUrl,
    item.resolvedUrl,
    item.description,
    item.key,
    item.durationSeconds ?? 0,
    secondsToTimestamp(item.durationSeconds ?? 0),
    item.descriptionFull,
    '',
    '',
    new Date().toISOString(),
  ];
}

function printDryRunReport(items, unparseableGuidCount) {
  const sorted = [...items].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const sampleIndices = [
    Math.floor(sorted.length * 0.25),
    Math.floor(sorted.length * 0.5),
    Math.floor(sorted.length * 0.75),
  ];

  console.log('--- DRY RUN REPORT ---');
  console.log(`Total items: ${items.length}`);
  console.log(`Oldest item: ${oldest ? `"${oldest.title}" (${oldest.publishedAt}, key=${oldest.key})` : 'none found'}`);
  console.log(`Newest item: ${newest ? `"${newest.title}" (${newest.publishedAt}, key=${newest.key})` : 'none found'}`);
  console.log('Representative samples:');
  for (const idx of sampleIndices) {
    const sample = sorted[idx];
    if (sample) {
      console.log(`  - "${sample.title}" (${sample.publishedAt}, key=${sample.key})`);
    }
  }
  console.log(`Items with unparseable guid (fell back to resolved URL as key): ${unparseableGuidCount}`);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (read-only)' : 'LIVE RUN (will write)'}`);

  console.log('Fetching SoundCloud RSS feed...');
  const response = await fetch(buildFeedUrl(FEED_URL));
  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status} ${await response.text()}`);
  }
  const xml = await response.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed.rss?.channel?.item ?? [];
  const rawItemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];
  console.log(`Feed returned ${rawItemsArray.length} raw item(s).`);

  const normalized = rawItemsArray.map(normalizeEntry).filter((item) => item.audioUrl);
  console.log(`${normalized.length} item(s) have a usable audio URL.`);

  let unparseableGuidCount = 0;
  const withTrackId = normalized.map((item) => {
    const trackId = extractTrackId(item.guid);
    if (trackId === null) {
      console.warn(`Unparseable guid for "${item.title}" (guid: ${item.guid}) — will use resolved URL as fallback key.`);
      unparseableGuidCount += 1;
    }
    return { ...item, trackId };
  });

  console.log(`Resolving episode URLs (batches of ${RESOLVE_BATCH_SIZE}, ${RESOLVE_BATCH_DELAY_MS}ms between batches)...`);
  const resolvedUrls = await resolveAllUrls(withTrackId.map((item) => item.audioUrl));

  const allItems = withTrackId.map((item, i) => {
    const resolvedUrl = resolvedUrls[i];
    return {
      ...item,
      resolvedUrl,
      key: item.trackId ?? resolvedUrl,
    };
  });

  // NOT a plain upsert keyed on the new track-ID column F — F is empty on
  // every pre-existing row today, so an F-keyed upsert would treat every
  // existing row as brand new and duplicate the whole sheet. Column C
  // (audioUrl, the OLD key) is used ONLY for this one migration pass to
  // distinguish "already in the sheet" from "brand new".
  //
  // This read+partition is read-only (no writes happen until appendRows/
  // updateRows below), so it runs before the dry-run exit — the dry-run
  // report is the main way a human checks the insert/update split (and
  // therefore whether the C-keyed migration risk below is actually present)
  // before approving a live write.
  console.log(`Reading existing "${SHEET_TAB}" rows (column C, the pre-existing audioUrl key) for migration...`);
  const existingByUrl = await getColumnWithRows(SHEET_TAB, 'C');

  const { toInsert, toUpdate } = partitionForUpsert(existingByUrl, allItems, (item) => item.audioUrl, toAudioRow);
  console.log(
    `Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update (keyed on column C / audioUrl for this one migration pass).`
  );

  if (DRY_RUN) {
    printDryRunReport(allItems, unparseableGuidCount);
    console.log(`Would insert: ${toInsert.length} new rows, update: ${toUpdate.length} existing rows.`);
    console.log('Dry run complete. No Sheet or Blob writes were made.');
    process.exit(0);
    return;
  }

  console.log('Appending new rows...');
  await appendRows(SHEET_TAB, toInsert);

  console.log('Updating existing rows (fixes column D, populates F/G/H/I/L)...');
  await updateRows(SHEET_TAB, toUpdate);

  console.log(`Updating audio Blob cache "${BLOB_STORE}"...`);
  const existingBlob = await getJSON(BLOB_STORE, BLOB_KEY, []);
  const merged = mergeEpisodesByGuid(existingBlob, normalized);
  await setJSON(BLOB_STORE, BLOB_KEY, merged);

  console.log('Verifying final counts...');
  const finalUrls = await getColumn(SHEET_TAB, 'C');
  console.log(`Sheet "${SHEET_TAB}" column C row count: ${finalUrls.length}. Blob cache episode count: ${merged.length}.`);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
