import { XMLParser } from 'fast-xml-parser';
import { setJSON } from './lib/blobs.js';
import { appendRow, getColumn } from './lib/sheets.js';
import { filterNewByKey } from './lib/idempotency.js';
import { getTokensForPreference, sendExpoPushBatch } from './lib/push.js';

export const config = { schedule: '*/15 * * * *' };

const CHANNEL_ID = 'UCtB5nbKHYsX8EGIk9cOevaQ';
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
  for (const item of newItems) {
    await appendRow('youtube rss', [
      item.title,
      `https://www.youtube.com/watch?v=${item.id}`,
      item.id,
      'video',
    ]);
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
