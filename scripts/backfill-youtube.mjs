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
// The live run only happens after a human has reviewed the dry-run report.

import { appendRows, getColumn, getColumnWithRows, updateRows } from '../netlify/functions/lib/sheets.js';
import { partitionForUpsert } from '../netlify/functions/lib/idempotency.js';
import { CHANNEL_ID, classifyVideo, parseISO8601Duration } from '../netlify/functions/lib/youtube.js';
import { secondsToTimestamp } from '../netlify/functions/lib/duration.js';
import { setJSON } from '../netlify/functions/lib/blobs.js';

const API_KEY = process.env.YOUTUBE_LIVE_STATUS_API_KEY;
if (!API_KEY) {
  console.error('Missing required env var: YOUTUBE_LIVE_STATUS_API_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const SHEET_TAB = 'youtube rss';
const ARCHIVE_STORE = 'qf-youtube-archive';
const ARCHIVE_KEY = 'episodes';

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

async function getUploadsPlaylistId() {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
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
  return uploadsPlaylistId;
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
    url.searchParams.set('part', 'snippet,contentDetails,liveStreamingDetails');
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

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (read-only)' : 'LIVE RUN (will write)'}`);

  console.log('Fetching uploads playlist ID...');
  const uploadsPlaylistId = await getUploadsPlaylistId();
  console.log(`Uploads playlist ID: ${uploadsPlaylistId}`);

  console.log('Paging through uploads playlist...');
  const videoIds = await getAllUploadedVideoIds(uploadsPlaylistId);
  console.log(`Found ${videoIds.length} uploaded videos.`);

  console.log('Fetching video details (snippet, contentDetails, liveStreamingDetails)...');
  const items = await getVideoDetails(videoIds);
  console.log(`Fetched details for ${items.length} videos.`);

  console.log(`Classifying content type for ${items.length} videos (batches of ${CLASSIFY_BATCH_SIZE})...`);
  const contentTypes = await classifyAll(items);

  const lastSyncedAt = new Date().toISOString();
  const allVideos = items.map((item, i) => {
    const durationSeconds = parseISO8601Duration(item.contentDetails.duration);
    return {
      id: item.id,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      contentType: contentTypes[i],
      publishedAt: item.snippet.publishedAt,
      durationSeconds,
      durationTimestamp: secondsToTimestamp(durationSeconds),
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url,
      lastSyncedAt,
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

  // This read+partition is read-only (no writes happen until appendRows/
  // updateRows below), so it runs before the dry-run exit — the dry-run
  // report is the main way a human checks the insert/update split before
  // approving a live write.
  console.log(`Reading existing "${SHEET_TAB}" rows (column C) for upsert...`);
  const existingRows = await getColumnWithRows(SHEET_TAB, 'C');

  const { toInsert, toUpdate } = partitionForUpsert(existingRows, allVideos, (v) => v.id, toYoutubeRow);
  console.log(`Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

  if (DRY_RUN) {
    const oldest = allVideos[allVideos.length - 1];
    const newest = allVideos[0];
    const firstShort = allVideos.find((v) => v.contentType === 'short');
    const firstLive = allVideos.find((v) => v.contentType === 'live');

    console.log('--- DRY RUN REPORT ---');
    console.log(`Total episodes: ${allVideos.length}`);
    console.log(`Oldest video: ${oldest ? `"${oldest.title}" (${oldest.publishedAt}, ${oldest.id})` : 'none found'}`);
    console.log(`Newest video: ${newest ? `"${newest.title}" (${newest.publishedAt}, ${newest.id})` : 'none found'}`);
    console.log(`First 'short': ${firstShort ? `"${firstShort.title}" (${firstShort.id})` : 'none found'}`);
    console.log(`First 'live': ${firstLive ? `"${firstLive.title}" (${firstLive.id})` : 'none found'}`);
    console.log(`Would insert: ${toInsert.length} new rows, update: ${toUpdate.length} existing rows.`);
    console.log('Dry run complete. No Sheet or Blob writes were made.');
    process.exit(0);
    return;
  }

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
