import { XMLParser } from 'fast-xml-parser';
import { setJSON, getJSON } from './lib/blobs.js';
import { appendRows, getColumn } from './lib/sheets.js';
import { filterNewByKey } from './lib/idempotency.js';

export const config = { schedule: '*/15 * * * *' };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
});

function formatDuration(itunesDuration) {
  if (!itunesDuration) return null;
  const parts = String(itunesDuration).split(':').map(Number);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (parts.length === 3) [hours, minutes, seconds] = parts;
  else if (parts.length === 2) [minutes, seconds] = parts;
  else if (parts.length === 1) [seconds] = parts;
  const totalMinutes = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function truncateDescription(summary) {
  if (!summary) return '';
  const firstParagraph = summary.split(/\n\s*\n/)[0].trim();
  const text = firstParagraph.length > 0 ? firstParagraph : summary.trim();
  if (text.length <= 280) return text;
  return `${text.slice(0, 277)}...`;
}

function normalizeEntry(item) {
  const guid = typeof item.guid === 'object' ? item.guid['#text'] : item.guid;
  return {
    guid,
    title: item.title,
    publishedAt: new Date(item.pubDate).toISOString(),
    audioUrl: item.enclosure?.url ?? null,
    description: truncateDescription(item.summary),
    duration: formatDuration(item.duration),
  };
}

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
  const existingByGuid = new Map(existing.map((ep) => [ep.guid, ep]));
  for (const item of items) {
    existingByGuid.set(item.guid, item);
  }
  const merged = Array.from(existingByGuid.values()).sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  await setJSON('qf-soundcloud-cache', 'episodes', merged);

  const existingAudioUrls = await getColumn('audio history', 'C');
  const newItems = filterNewByKey(existingAudioUrls, items, (item) => item.audioUrl);
  const rows = newItems.map((item) => [
    item.title,
    item.publishedAt,
    item.audioUrl,
    feedUrl,
    item.description,
  ]);
  await appendRows('audio history', rows);

  return new Response(
    JSON.stringify({ ok: true, cached: merged.length, newRows: newItems.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
