import { XMLParser } from 'fast-xml-parser';
import { getJSON, setJSON } from './lib/blobs.js';
import { appendRow, getColumn } from './lib/sheets.js';
import { filterNewByKey } from './lib/idempotency.js';
import { getTokensForPreference, sendExpoPushBatch } from './lib/push.js';
import { CHANNEL_ID, classifyVideo, mergeVideosById, parseISO8601Duration } from './lib/youtube.js';
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

  await setJSON('qf-youtube-cache', 'feed', {
    mostRecent: items[0] ?? null,
    gridItems: items.slice(1, 15),
    updatedAt: new Date().toISOString(),
  });

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
    if (video) {
      durationSeconds = parseISO8601Duration(video.contentDetails.duration);
      description = video.snippet.description ?? '';
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
    });
  }

  if (newArchiveItems.length > 0) {
    const existingArchive = await getJSON('qf-youtube-archive', 'episodes', []);
    const mergedArchive = mergeVideosById(existingArchive, newArchiveItems);
    await setJSON('qf-youtube-archive', 'episodes', mergedArchive);
  }

  if (newItems.length > 0) {
    try {
      const tokens = await getTokensForPreference('video');
      for (const item of newItems) {
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
