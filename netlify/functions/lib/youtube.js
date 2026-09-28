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
  // 'upcoming' is a pre-loaded/scheduled broadcast that hasn't actually
  // started — kept distinct from 'live' so callers (Home's Most Recent
  // selection, the new-video push) can treat "not real yet" differently
  // from a genuinely live or already-aired stream.
  if (liveBroadcastContent === 'upcoming') {
    return 'upcoming';
  }
  if (liveBroadcastContent === 'live' || hasLiveStreamingDetails) {
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

export const UPCOMING_WINDOW_MS = 3 * 60 * 60 * 1000;

// Picks Home's "Most Recent" item from `items` (RSS order, newest first).
// getArchived(id) looks up that item's archive record (contentType,
// scheduledStartTime), e.g. a Map's .get bound, or archiveById.get.
//
// Priority: a pre-loaded/'upcoming' item due within UPCOMING_WINDOW_MS of
// its scheduledStartTime wins outright — it's about to be the show, so it
// takes over even if something else was published more recently (a Short
// posted while the pre-load sits waiting shouldn't bump it). Otherwise,
// fall back to the newest item that isn't 'upcoming' at all — a pre-load
// still more than the window away is invisible to this selection, same as
// one with no known scheduledStartTime (fails open: never hidden, just
// never prioritized either).
export function pickMostRecentItem(items, getArchived, now = Date.now()) {
  const dueSoon = items.find((item) => {
    const archived = getArchived(item.id);
    if (archived?.contentType !== 'upcoming' || !archived.scheduledStartTime) return false;
    return new Date(archived.scheduledStartTime).getTime() - now <= UPCOMING_WINDOW_MS;
  });
  if (dueSoon) return dueSoon;
  return items.find((item) => getArchived(item.id)?.contentType !== 'upcoming') ?? items[0] ?? null;
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
