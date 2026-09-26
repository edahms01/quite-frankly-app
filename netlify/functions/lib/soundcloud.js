import { parseTimestampToSeconds } from './duration.js';

// Thin wrapper — takes SECONDS now (not raw text, that's the signature
// change from the old poll-soundcloud.js version), rounds to nearest
// minute, formats as "Xh Ym" / "Ym". Output is UNCHANGED from before —
// still what Listen.js renders via the `duration` field.
export function formatDuration(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function truncateDescription(summary) {
  if (!summary) return '';
  const firstParagraph = summary.split(/\n\s*\n/)[0].trim();
  const text = firstParagraph.length > 0 ? firstParagraph : summary.trim();
  if (text.length <= 280) return text;
  return `${text.slice(0, 277)}...`;
}

// Extended from the original: now also returns durationSeconds (raw, for
// the new sheet columns) and descriptionFull (untruncated raw summary,
// for the new "Full Description" sheet column). The rounded `duration`
// field and truncated `description` field are UNCHANGED in behavior —
// existing consumers (Listen.js via the qf-soundcloud-cache blob) see no
// difference.
export function normalizeEntry(item) {
  const guid = typeof item.guid === 'object' ? item.guid['#text'] : item.guid;
  const durationSeconds = parseTimestampToSeconds(item.duration); // raw itunes:duration text, parsed once, here
  return {
    guid,
    title: item.title,
    publishedAt: new Date(item.pubDate).toISOString(),
    audioUrl: item.enclosure?.url ?? null,
    description: truncateDescription(item.summary),
    descriptionFull: item.summary,
    duration: formatDuration(durationSeconds),
    durationSeconds,
  };
}

// Parses the SoundCloud track ID out of the RSS item's guid. Typical
// formats: "tag:soundcloud,2010:tracks/1234567890" or a bare numeric ID.
// Returns null if unparseable — callers (Task 7's backfill script) fall
// back to using the resolved URL as a synthetic key rather than silently
// dropping the episode.
export function extractTrackId(guid) {
  const match = String(guid).match(/(\d+)\s*$/);
  return match ? match[1] : null;
}

// Follows a redirect ONE hop only (fetch with redirect:'manual', reads the
// Location header) — matches the brief's "follow the chrt.fm redirect
// once." Falls back to the original URL if the response isn't a redirect
// or on network error, so one bad URL never fails the whole batch.
export async function resolveEpisodeUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    const location = response.headers.get('location');
    return location || url;
  } catch {
    return url;
  }
}

// Same guid-keyed Map-merge-and-sort logic poll-soundcloud.js's default
// export currently does inline for the qf-soundcloud-cache blob — extract
// it here so the backfill script (Task 7) and the poller (Task 9, not
// part of this task) share one implementation instead of duplicating it.
// existing/incoming are both arrays of normalizeEntry() output objects.
export function mergeEpisodesByGuid(existing, incoming) {
  const existingByGuid = new Map(existing.map((ep) => [ep.guid, ep]));
  for (const item of incoming) {
    existingByGuid.set(item.guid, item);
  }
  return Array.from(existingByGuid.values()).sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}
