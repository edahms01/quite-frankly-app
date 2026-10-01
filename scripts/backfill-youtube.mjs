// One-off backfill of the channel's full YouTube upload history into the
// 'youtube rss' Google Sheet tab and the qf-youtube-archive blob store.
//
// Existing rows only have A-D populated, and D is currently the hardcoded
// literal 'video' for every row (a bug). This backfill fetches accurate
// content types (video/short/live) and back-fills E-J for every row, while
// upserting any videos missing from the sheet entirely.
//
// Run with all Netlify env vars injected:
//   netlify dev:exec -- node scripts/backfill-youtube.mjs --dry-run   (read-only report, no writes)
//   netlify dev:exec -- node scripts/backfill-youtube.mjs             (live upsert + archive write)
//
// --archive-only: blob-only mode (no Sheet reads/writes at all). Fetches the
// extra per-video fields (see buildArchiveExtras) and MERGES them into the
// existing qf-youtube-archive blob without overwriting anything. Needs the
// getJSON CLI fallback under dev:exec:
//   NETLIFY_BLOBS_CLI_FALLBACK=1 netlify dev:exec -- node scripts/backfill-youtube.mjs --archive-only [--dry-run]
//
// The live run only happens after a human has reviewed the dry-run report.

import { appendRows, formatColumnsAsText, getColumn, getColumnWithRows, updateRows } from '../netlify/functions/lib/sheets.js';
import { partitionForUpsert } from '../netlify/functions/lib/idempotency.js';
import { CHANNEL_ID, buildArchiveExtras, classifyVideo, mergeArchiveBackfill, parseISO8601Duration } from '../netlify/functions/lib/youtube.js';
import { secondsToTimestamp } from '../netlify/functions/lib/duration.js';
import { getJSON, setJSON } from '../netlify/functions/lib/blobs.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const API_KEY = process.env.YOUTUBE_LIVE_STATUS_API_KEY;
if (!API_KEY) {
  console.error('Missing required env var: YOUTUBE_LIVE_STATUS_API_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const ARCHIVE_ONLY = process.argv.includes('--archive-only');

const SHEET_TAB = 'youtube rss';
const ARCHIVE_STORE = 'qf-youtube-archive';
const ARCHIVE_KEY = 'episodes';
const BACKUP_KEY = 'episodes-backup-2026-10-01';
const BACKUP_FILE = '/Users/eric/Desktop/Claude/qf-backup-2026-10-01/youtube-archive-episodes.json';

// classifyVideo makes a real HTTP call for any video <=180s, so classification
// is batched rather than fired unbounded across the whole channel history.
const CLASSIFY_BATCH_SIZE = 10;
const CLASSIFY_BATCH_DELAY_MS = 200;

const QUOTA_WARN_THRESHOLD = 500;

let quotaUnits = 0;

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

async function getChannelInfo() {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id=${CHANNEL_ID}&key=${API_KEY}`;
  const response = await fetch(url);
  quotaUnits += 1;
  if (!response.ok) {
    throw new Error(`channels.list failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const uploadsPlaylistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error('channels.list response did not contain contentDetails.relatedPlaylists.uploads');
  }
  const videoCount = Number(data.items?.[0]?.statistics?.videoCount);
  return { uploadsPlaylistId, videoCount: Number.isFinite(videoCount) ? videoCount : null };
}

async function getAllUploadedVideoIds(uploadsPlaylistId) {
  const videoIds = [];
  let pageToken;
  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('playlistId', uploadsPlaylistId);
    url.searchParams.set('maxResults', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', API_KEY);

    const response = await fetch(url);
    quotaUnits += 1;
    if (!response.ok) {
      throw new Error(`playlistItems.list failed: ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    for (const item of data.items ?? []) {
      videoIds.push(item.contentDetails.videoId);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return videoIds;
}

async function getVideoDetails(videoIds) {
  const items = [];
  for (const idChunk of chunk(videoIds, 50)) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails,liveStreamingDetails,statistics,status');
    url.searchParams.set('id', idChunk.join(','));
    url.searchParams.set('key', API_KEY);

    const response = await fetch(url);
    quotaUnits += 1;
    if (!response.ok) {
      throw new Error(`videos.list failed: ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    items.push(...(data.items ?? []));
  }
  return items;
}

// Concurrency-capped classification: batches of ~10 videos in parallel via
// Promise.all, with a short delay between batches. Not a bare sequential
// for-await loop, and not an unbounded Promise.all over the whole channel
// history — classifyVideo hits a real HTTP endpoint for any video <=180s.
async function classifyAll(items) {
  const results = new Array(items.length);
  const batches = chunk(items, CLASSIFY_BATCH_SIZE);
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const batchResults = await Promise.all(
      batch.map((item) =>
        classifyVideo({
          videoId: item.id,
          durationSeconds: parseISO8601Duration(item.contentDetails.duration),
          liveBroadcastContent: item.snippet.liveBroadcastContent,
          hasLiveStreamingDetails: 'liveStreamingDetails' in item,
        })
      )
    );
    for (let i = 0; i < batch.length; i++) {
      results[b * CLASSIFY_BATCH_SIZE + i] = batchResults[i];
    }
    if (b < batches.length - 1) {
      await sleep(CLASSIFY_BATCH_DELAY_MS);
    }
  }
  return results;
}

// Builds the full A-J row for a video. Shared by both the insert and update
// paths so the two can never drift out of sync with each other.
function toYoutubeRow(video) {
  return [
    video.title,
    video.url,
    video.id,
    video.contentType,
    video.publishedAt,
    video.durationSeconds,
    video.durationTimestamp,
    video.description,
    video.thumbnailUrl,
    video.lastSyncedAt,
  ];
}

// Cheap change-detector for the abort-on-change safety: item count plus every
// id/lastSyncedAt pair. The poller rewrites the blob every time it archives a
// new video, which always changes at least one of these.
function archiveSignature(archive) {
  return `${archive.length}|${archive.map((v) => `${v.id}:${v.lastSyncedAt ?? ''}`).join(',')}`;
}

async function readExistingArchive() {
  const archive = await getJSON(ARCHIVE_STORE, ARCHIVE_KEY, null);
  if (!Array.isArray(archive) || archive.length === 0) {
    // A failed/empty read must never be treated as "no blob": merging against
    // [] and writing would wipe every blob-only entry.
    throw new Error(`Existing ${ARCHIVE_STORE}/${ARCHIVE_KEY} read returned no items (null, empty or not an array); aborting.`);
  }
  return archive;
}

// Backs up the current blob BEFORE any write: a second blob key plus a local
// file outside the repo. Verifies all three item counts match; throws if not.
async function backupArchive(existing) {
  const already = await getJSON(ARCHIVE_STORE, BACKUP_KEY, null);
  if (already) {
    throw new Error(`Backup key "${BACKUP_KEY}" already exists (${Array.isArray(already) ? already.length : '?'} items); refusing to overwrite it. Aborting.`);
  }
  mkdirSync(dirname(BACKUP_FILE), { recursive: true });
  writeFileSync(BACKUP_FILE, JSON.stringify(existing));
  await setJSON(ARCHIVE_STORE, BACKUP_KEY, existing);
  const backedUp = await getJSON(ARCHIVE_STORE, BACKUP_KEY, null);
  const fileCount = JSON.parse(readFileSync(BACKUP_FILE, 'utf8')).length;
  const counts = { blob: existing.length, backupKey: backedUp?.length, backupFile: fileCount };
  console.log(`Backup counts: blob=${counts.blob}, blob backup key=${counts.backupKey}, local file=${counts.backupFile}`);
  if (counts.backupKey !== counts.blob || counts.backupFile !== counts.blob) {
    throw new Error('Backup count mismatch; aborting before any archive write.');
  }
  console.log(`Backup verified: key "${BACKUP_KEY}" and ${BACKUP_FILE}`);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (read-only)' : 'LIVE RUN (will write)'}${ARCHIVE_ONLY ? ' [--archive-only: blob merge, no Sheet access]' : ''}`);

  console.log('Fetching uploads playlist ID and channel statistics...');
  const { uploadsPlaylistId, videoCount: channelVideoCount } = await getChannelInfo();
  console.log(`Uploads playlist ID: ${uploadsPlaylistId}`);

  console.log('Paging through uploads playlist...');
  const videoIds = await getAllUploadedVideoIds(uploadsPlaylistId);
  console.log(`Found ${videoIds.length} uploaded videos.`);

  console.log('Fetching video details (snippet, contentDetails, liveStreamingDetails, statistics, status)...');
  const items = await getVideoDetails(videoIds);
  console.log(`Fetched details for ${items.length} videos.`);

  let existingArchive = null;
  let existingById = new Map();
  if (ARCHIVE_ONLY) {
    console.log(`Reading existing blob ${ARCHIVE_STORE}/${ARCHIVE_KEY}...`);
    existingArchive = await readExistingArchive();
    existingById = new Map(existingArchive.map((v) => [v.id, v]));
    console.log(`Existing blob: ${existingArchive.length} items.`);
  }

  // In --archive-only mode existing entries keep their stored contentType, so
  // only videos missing from the blob need classifying (fewer external HEADs).
  const toClassify = ARCHIVE_ONLY ? items.filter((item) => !existingById.has(item.id)) : items;
  console.log(`Classifying content type for ${toClassify.length} videos (batches of ${CLASSIFY_BATCH_SIZE})...`);
  const classified = await classifyAll(toClassify);
  const contentTypeById = new Map(toClassify.map((item, i) => [item.id, classified[i]]));

  const lastSyncedAt = new Date().toISOString();
  const allVideos = items.map((item) => {
    const durationSeconds = parseISO8601Duration(item.contentDetails.duration);
    return {
      id: item.id,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      contentType: contentTypeById.get(item.id) ?? existingById.get(item.id)?.contentType,
      publishedAt: item.snippet.publishedAt,
      durationSeconds,
      durationTimestamp: secondsToTimestamp(durationSeconds),
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url,
      lastSyncedAt,
      ...buildArchiveExtras(item),
    };
  });

  // Descending (newest first) — required for get-youtube-episodes.js's
  // pagination (Task 10) and to match qf-soundcloud-cache's convention.
  // Do NOT flip this to ascending: an ascending archive plus a plain
  // positional slice in the pagination endpoint would serve oldest-first.
  allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  console.log(`Total quota units used: ${quotaUnits}`);
  if (quotaUnits > QUOTA_WARN_THRESHOLD) {
    console.warn(`⚠️ QUOTA CHECK: total quota units = ${quotaUnits}`);
  }

  const oldest = allVideos[allVideos.length - 1];
  const newest = allVideos[0];
  const firstShort = allVideos.find((v) => v.contentType === 'short');
  const firstLive = allVideos.find((v) => v.contentType === 'live');

  function printExtrasReport() {
    const live = items.filter((item) => 'liveStreamingDetails' in item);
    console.log(`Channel statistics.videoCount: ${channelVideoCount}`);
    console.log(`Uploads playlist items: ${videoIds.length}; videos.list returned: ${items.length}`);
    console.log(`Videos with liveStreamingDetails: ${live.length}`);
    console.log(`  with actualStartTime: ${live.filter((i) => i.liveStreamingDetails.actualStartTime).length}`);
    console.log(`  with actualEndTime: ${live.filter((i) => i.liveStreamingDetails.actualEndTime).length}`);
    console.log(`  with scheduledStartTime: ${live.filter((i) => i.liveStreamingDetails.scheduledStartTime).length}`);
    console.log(`Items with statistics.viewCount: ${items.filter((i) => i.statistics?.viewCount !== undefined).length}`);
    console.log(`Items with likeCount: ${items.filter((i) => i.statistics?.likeCount !== undefined).length}; commentCount: ${items.filter((i) => i.statistics?.commentCount !== undefined).length}`);
    console.log(`Items with tags: ${items.filter((i) => (i.snippet?.tags ?? []).length > 0).length}`);
    console.log(`Items with defaultAudioLanguage: ${items.filter((i) => i.snippet?.defaultAudioLanguage).length}`);
    const privacy = {};
    for (const i of items) privacy[i.status?.privacyStatus ?? 'none'] = (privacy[i.status?.privacyStatus ?? 'none'] ?? 0) + 1;
    console.log(`privacyStatus: ${JSON.stringify(privacy)}`);
  }

  if (ARCHIVE_ONLY) {
    const { merged, stats } = mergeArchiveBackfill(existingArchive, allVideos);
    const missingIds = items.filter((i) => !existingById.has(i.id)).map((i) => i.id);
    const blobOnlyIds = existingArchive.filter((v) => !items.some((i) => i.id === v.id)).map((v) => v.id);

    console.log('--- ARCHIVE-ONLY REPORT ---');
    printExtrasReport();
    console.log(`Existing blob items: ${existingArchive.length}`);
    console.log(`  would gain fields: ${stats.enriched}`);
    console.log(`  blob-only (API no longer returns; kept untouched): ${stats.blobOnly}${blobOnlyIds.length ? ` [${blobOnlyIds.slice(0, 10).join(', ')}]` : ''}`);
    console.log(`API items missing from blob (would be appended): ${stats.appended}${missingIds.length ? ` [${missingIds.slice(0, 10).join(', ')}]` : ''}`);
    console.log(`Merged archive size: ${merged.length}`);
    console.log(`Quota units used: ${quotaUnits}`);

    if (DRY_RUN) {
      console.log('Dry run complete. No Sheet or Blob writes were made.');
      process.exit(0);
      return;
    }

    await backupArchive(existingArchive);

    // Abort if the poller (or anything else) changed the blob since our read.
    const fresh = await readExistingArchive();
    if (archiveSignature(fresh) !== archiveSignature(existingArchive)) {
      throw new Error('Blob changed since it was read (item count or id/lastSyncedAt differ); aborting without writing. Re-run.');
    }
    console.log(`Writing merged archive (${merged.length} items) to "${ARCHIVE_STORE}/${ARCHIVE_KEY}"...`);
    await setJSON(ARCHIVE_STORE, ARCHIVE_KEY, merged);
    const after = await getJSON(ARCHIVE_STORE, ARCHIVE_KEY, null);
    console.log(`Re-read blob: ${after?.length} items (expected ${merged.length}).`);
    console.log('Done. (No Sheet access in --archive-only mode.)');
    return;
  }

  // This read+partition is read-only (no writes happen until appendRows/
  // updateRows below), so it runs before the dry-run exit — the dry-run
  // report is the main way a human checks the insert/update split before
  // approving a live write.
  console.log(`Reading existing "${SHEET_TAB}" rows (column C) for upsert...`);
  const existingRows = await getColumnWithRows(SHEET_TAB, 'C');

  const { toInsert, toUpdate } = partitionForUpsert(existingRows, allVideos, (v) => v.id, toYoutubeRow);
  console.log(`Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

  if (DRY_RUN) {
    console.log('--- DRY RUN REPORT ---');
    console.log(`Total episodes: ${allVideos.length}`);
    console.log(`Oldest video: ${oldest ? `"${oldest.title}" (${oldest.publishedAt}, ${oldest.id})` : 'none found'}`);
    console.log(`Newest video: ${newest ? `"${newest.title}" (${newest.publishedAt}, ${newest.id})` : 'none found'}`);
    console.log(`First 'short': ${firstShort ? `"${firstShort.title}" (${firstShort.id})` : 'none found'}`);
    console.log(`First 'live': ${firstLive ? `"${firstLive.title}" (${firstLive.id})` : 'none found'}`);
    console.log(`Would insert: ${toInsert.length} new rows, update: ${toUpdate.length} existing rows.`);
    printExtrasReport();
    console.log('Dry run complete. No Sheet or Blob writes were made.');
    process.exit(0);
    return;
  }

  // Idempotent: safe to write on every live run, including re-runs. Preserves
  // the sheet's pre-existing A-D header text exactly (confirmed against the
  // live sheet) -- only names the columns this backfill added.
  console.log('Writing header row (adds labels for the new columns)...');
  await updateRows(SHEET_TAB, [{
    row: 1,
    values: ['Episode Title', 'YouTube URL', 'ID', 'Type', 'Published Date', 'Duration Seconds', 'Duration', 'Description', 'Thumbnail URL', 'Last Synced At'],
  }]);

  // Duration Seconds (F) is a plain short integer -- Sheets auto-types it as
  // a real NUMBER regardless of valueInputOption/format, so it never shows
  // the apostrophe indicator and doesn't need this. Only G (the H:MM:SS
  // string, which Sheets can't parse as a number) is actually affected.
  console.log('Setting Duration column to TEXT format (prevents the apostrophe indicator on the H:MM:SS value)...');
  await formatColumnsAsText(SHEET_TAB, ['G']);

  console.log('Appending new rows...');
  await appendRows(SHEET_TAB, toInsert);

  console.log('Updating existing rows (fixes column D, back-fills E-J)...');
  await updateRows(SHEET_TAB, toUpdate);

  console.log(`Writing full archive to blob store "${ARCHIVE_STORE}"...`);
  await setJSON(ARCHIVE_STORE, ARCHIVE_KEY, allVideos);

  console.log('Verifying final row count...');
  const finalIds = await getColumn(SHEET_TAB, 'C');
  if (finalIds.length === allVideos.length) {
    console.log(`MATCH: sheet has ${finalIds.length} rows in column C, expected ${allVideos.length}.`);
  } else {
    console.log(`MISMATCH: sheet has ${finalIds.length} rows in column C, expected ${allVideos.length}.`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
