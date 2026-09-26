// Whole-seconds → "H:MM:SS" standardized timestamp string, for the new sheet columns.
export function secondsToTimestamp(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Parses "H:MM:SS" / "MM:SS" / "SS" (itunes:duration text) → raw whole
// seconds, no rounding. This is the seconds-parsing half of what used to
// be poll-soundcloud.js's formatDuration — split out because it's not
// audio-specific, and because formatDuration's OLD behavior (round to
// nearest minute, format as "Xh Ym") stays as audio-only display logic in
// lib/soundcloud.js (a different task), built on top of this function's
// raw seconds output.
export function parseTimestampToSeconds(itunesDuration) {
  if (!itunesDuration) return 0;
  const parts = String(itunesDuration).split(':').map(Number);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (parts.length === 3) [hours, minutes, seconds] = parts;
  else if (parts.length === 2) [minutes, seconds] = parts;
  else if (parts.length === 1) [seconds] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}
