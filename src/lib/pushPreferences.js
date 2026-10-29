// Pure push-preference helpers, split out of pushNotifications.js (which
// imports native modules) so node:test can cover them.
export const DEFAULT_PREFERENCES = { live: true, video: true, substack: true };

// Stored preferences from an older install have no key for alerts added
// later (e.g. `substack`). Merge over the defaults so a new alert shows ON,
// not undefined/off. Bad or non-object JSON falls back to the defaults.
export function mergePreferences(raw) {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const stored = JSON.parse(raw);
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...stored };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
