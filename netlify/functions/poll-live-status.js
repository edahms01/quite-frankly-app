import { getJSON, setJSON } from './lib/blobs.js';

export const config = { schedule: '*/3 * * * *' };

const CHANNEL_ID = 'UCtB5nbKHYsX8EGIk9cOevaQ';
const FALLBACK_MIN_GAP_MS = 55 * 60 * 1000;

const WEEKNIGHT_WINDOW = { startH: 18, startM: 30, endH: 21, endM: 30 };

function getEasternParts(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdayMap[parts.weekday],
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

function isWithinWeeknightWindow({ weekday, hour, minute }) {
  if (weekday < 1 || weekday > 5) return false;
  const t = hour * 60 + minute;
  const start = WEEKNIGHT_WINDOW.startH * 60 + WEEKNIGHT_WINDOW.startM;
  const end = WEEKNIGHT_WINDOW.endH * 60 + WEEKNIGHT_WINDOW.endM;
  return t >= start && t <= end;
}

export default async () => {
  const apiKey = process.env.YOUTUBE_LIVE_STATUS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'YOUTUBE_LIVE_STATUS_API_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const inWindow = isWithinWeeknightWindow(getEasternParts(now));

  if (!inWindow) {
    const meta = await getJSON('qf-live-status', 'meta', { lastCheckedAt: 0 });
    if (Date.now() - meta.lastCheckedAt < FALLBACK_MIN_GAP_MS) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return new Response(JSON.stringify({ error: `Live status request failed: ${response.status}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const isLive = (data.items?.length ?? 0) > 0;

  await setJSON('qf-live-status', 'status', { isLive, checkedAt: now.toISOString() });
  await setJSON('qf-live-status', 'meta', { lastCheckedAt: now.getTime() });

  return new Response(JSON.stringify({ ok: true, isLive, inWindow }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
