import { XMLParser } from 'fast-xml-parser';
import { setJSON, getJSON } from './lib/blobs.js';
import { appendRows, getColumn } from './lib/sheets.js';
import { filterNewByKey } from './lib/idempotency.js';
import {
  formatDuration,
  truncateDescription,
  normalizeEntry,
  resolveEpisodeUrl,
  extractTrackId,
  mergeEpisodesByGuid,
} from './lib/soundcloud.js';
import { secondsToTimestamp } from './lib/duration.js';

export const config = { schedule: '*/15 * * * *' };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
});

export default async () => {
  const feedUrl = process.env.SOUNDCLOUD_RSS_URL;
  if (!feedUrl) {
    return new Response(JSON.stringify({ error: 'SOUNDCLOUD_RSS_URL not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(feedUrl);
  if (!response.ok) {
    return new Response(JSON.stringify({ error: `Feed request failed: ${response.status}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed.rss?.channel?.item ?? [];
  const items = (Array.isArray(rawItems) ? rawItems : [rawItems])
    .map(normalizeEntry)
    .filter((item) => item.audioUrl);

  const existing = await getJSON('qf-soundcloud-cache', 'episodes', []);
  const merged = mergeEpisodesByGuid(existing, items);
  await setJSON('qf-soundcloud-cache', 'episodes', merged);

  const existingTrackIds = await getColumn('audio history', 'F');
  const newItems = filterNewByKey(
    existingTrackIds,
    items.map((item) => ({ ...item, trackId: extractTrackId(item.guid) })),
    (item) => item.trackId
  );

  const rows = [];
  for (const item of newItems) {
    const resolvedUrl = await resolveEpisodeUrl(item.audioUrl);
    rows.push([
      item.title,
      item.publishedAt,
      item.audioUrl,
      resolvedUrl,
      item.description,
      item.trackId ?? resolvedUrl,
      item.durationSeconds ?? 0,
      secondsToTimestamp(item.durationSeconds ?? 0),
      item.descriptionFull,
      '',
      '',
      new Date().toISOString(),
    ]);
  }
  await appendRows('audio history', rows);

  return new Response(
    JSON.stringify({ ok: true, cached: merged.length, newRows: newItems.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
