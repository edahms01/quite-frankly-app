export const CHANNEL_ID = 'UCtB5nbKHYsX8EGIk9cOevaQ';

// Parses ISO 8601 duration ("PT4M13S", "PT1H2M3S", "PT45S") to whole seconds.
export function parseISO8601Duration(duration) {
  const match = String(duration).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function classifyVideo({ videoId, durationSeconds, liveBroadcastContent, hasLiveStreamingDetails }) {
  if (liveBroadcastContent === 'live' || liveBroadcastContent === 'upcoming' || hasLiveStreamingDetails) {
    return 'live';
  }
  // Shorts have a hard 180s format ceiling (raised from 60s, Oct 2024) — YouTube's
  // own rule, not a guess. Skips the HTTP check below for the vast majority of a
  // podcast channel's uploads (anything over 3 minutes can't be a Short, period).
  if (durationSeconds > 180) return 'video';
  return (await isShort(videoId)) ? 'short' : 'video';
}

async function isShort(videoId) {
  const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, { method: 'HEAD', redirect: 'manual' });
  return res.status === 200; // 3xx = redirected to /watch = not actually a Short
}

// Same guid-keyed merge pattern as lib/soundcloud.js's mergeEpisodesByGuid,
// but keyed on video id and applied to the YouTube archive shape.
export function mergeVideosById(existing, incoming) {
  const existingById = new Map(existing.map((v) => [v.id, v]));
  for (const item of incoming) {
    existingById.set(item.id, item);
  }
  return Array.from(existingById.values()).sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}
