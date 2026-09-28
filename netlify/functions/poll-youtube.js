import { XMLParser } from 'fast-xml-parser';
import { getJSON, setJSON } from './lib/blobs.js';
import { appendRow, getColumn } from './lib/sheets.js';
import { filterNewByKey } from './lib/idempotency.js';
import { getTokensForPreference, sendExpoPushBatch } from './lib/push.js';
import { CHANNEL_ID, classifyVideo, mergeVideosById, parseISO8601Duration, pickMostRecentItem } from './lib/youtube.js';
import { secondsToTimestamp } from './lib/duration.js';

export const config = { schedule: '*/15 * * * *' };

const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
});

function normalizeEntry(entry) {
  const id = entry.videoId;
  const thumbnail = entry.group?.thumbnail;
  return {
    id,
    title: entry.title,
    publishedAt: entry.published,
    thumbnailUrl: thumbnail?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

export default async () => {
  const response = await fetch(FEED_URL);
  if (!response.ok) {
    return new Response(JSON.stringify({ error: `Feed request failed: ${response.status}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const entries = parsed.feed?.entry ?? [];
  const items = (Array.isArray(entries) ? entries : [entries]).map(normalizeEntry);

  const existingIds = await getColumn('youtube rss', 'C');
  const newItems = filterNewByKey(existingIds, items, (item) => item.id);

  const YOUTUBE_API_KEY = process.env.YOUTUBE_LIVE_STATUS_API_KEY;
  let enrichedById = new Map();
  if (newItems.length > 0 && YOUTUBE_API_KEY) {
    const ids = newItems.map((item) => item.id).join(',');
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails&id=${ids}&key=${YOUTUBE_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      for (const video of data.items ?? []) {
        enrichedById.set(video.id, video);
      }
    } else {
      console.error(`videos.list enrichment failed: ${res.status}`);
    }
  } else if (newItems.length > 0) {
    console.warn('YOUTUBE_LIVE_STATUS_API_KEY not set; falling back to default classification for new videos');
  }

  const newArchiveItems = [];
  for (const item of newItems) {
    const video = enrichedById.get(item.id);
    let contentType = 'video';
    let durationSeconds = 0;
    let description = '';
    let scheduledStartTime = null;
    if (video) {
      durationSeconds = parseISO8601Duration(video.contentDetails.duration);
      description = video.snippet.description ?? '';
      scheduledStartTime = video.liveStreamingDetails?.scheduledStartTime ?? null;
      const hasLiveStreamingDetails = 'liveStreamingDetails' in video;
      try {
        contentType = await classifyVideo({
          videoId: item.id,
          durationSeconds,
          liveBroadcastContent: video.snippet.liveBroadcastContent,
          hasLiveStreamingDetails,
        });
      } catch (err) {
        console.error(`classifyVideo failed for ${item.id}, defaulting to 'video':`, err.message);
        // contentType stays at its 'video' default — durationSeconds/description are unaffected.
      }
    }
    const url = `https://www.youtube.com/watch?v=${item.id}`;
    const lastSyncedAt = new Date().toISOString();
    await appendRow('youtube rss', [
      item.title,
      url,
      item.id,
      contentType,
      item.publishedAt,
      durationSeconds,
      secondsToTimestamp(durationSeconds),
      description,
      item.thumbnailUrl,
      lastSyncedAt,
    ]);
    newArchiveItems.push({
      id: item.id,
      title: item.title,
      url,
      contentType,
      publishedAt: item.publishedAt,
      durationSeconds,
      durationTimestamp: secondsToTimestamp(durationSeconds),
      description,
      thumbnailUrl: item.thumbnailUrl,
      lastSyncedAt,
      scheduledStartTime,
    });
  }

  // Loaded unconditionally (not just when there are new videos) so the
  // feed cache below can pull each RSS item's description from the
  // archive — the RSS feed itself never carries descriptions, only the
  // enriched/backfilled archive does.
  const existingArchive = await getJSON('qf-youtube-archive', 'episodes', []);
  const mergedArchive = newArchiveItems.length > 0
    ? mergeVideosById(existingArchive, newArchiveItems)
    : existingArchive;
  if (newArchiveItems.length > 0) {
    await setJSON('qf-youtube-archive', 'episodes', mergedArchive);
  }

  // Only mostRecent is cached here now — it's the one thing Home.js's
  // "Most Recent" card still needs from the raw RSS poll. Watch.js reads
  // its whole list from the archive (get-youtube-episodes.js) instead of
  // a parallel gridItems cache, so this poll's only other job is
  // discovering brand-new videos to classify and archive above.
  //
  // mostRecent prioritizes a pre-loaded/'upcoming' broadcast once it's
  // within pickMostRecentItem's window of its scheduledStartTime — even
  // over something nominally more recently published — and otherwise
  // falls back to the newest non-'upcoming' item. No separate UI state
  // needed either way: Home's card already flips its own badge from
  // "MOST RECENT" to "LIVE NOW" off the Twitch webhook signal, independent
  // of this selection.
  const archiveById = new Map(mergedArchive.map((e) => [e.id, e]));
  const mostRecentItem = pickMostRecentItem(items, (id) => archiveById.get(id));

  await setJSON('qf-youtube-cache', 'feed', {
    mostRecent: mostRecentItem
      ? {
          ...mostRecentItem,
          description: archiveById.get(mostRecentItem.id)?.description ?? '',
          contentType: archiveById.get(mostRecentItem.id)?.contentType,
        }
      : null,
    updatedAt: new Date().toISOString(),
  });

  // Twitch EventSub is the only live-alert source (real-time, no polling
  // delay) — never push a "new video" notification for anything the
  // YouTube poll classified as 'live' or 'upcoming', genuine live start or
  // pre-load alike. Only a real regular upload/short gets this push.
  const itemsToNotify = newArchiveItems.filter(
    (item) => item.contentType !== 'upcoming' && item.contentType !== 'live'
  );
  if (itemsToNotify.length > 0) {
    try {
      const tokens = await getTokensForPreference('video');
      for (const item of itemsToNotify) {
        await sendExpoPushBatch(tokens, {
          title: 'New video from Quite Frankly',
          body: item.title,
        });
      }
    } catch (err) {
      console.error('Push notification step failed for new videos', err);
    }
  }

  return new Response(JSON.stringify({ ok: true, cached: items.length, newRows: newItems.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
