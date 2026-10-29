import { getJSON } from './blobs.js';

// Remote feature flags (Blobs store `qf-flags`, key `flags`). A default-OFF flag turns on only for a literal `true`; a default-ON flag (askfrankie_enabled, since the Play launch) stays on unless the blob holds a literal `false` (the kill switch). Flip with
//   node scripts/set-flag.mjs accounts on        (merges into the current blob; raw `blobs:set` replaces the whole object)
//   netlify blobs:set qf-flags flags '{"askfrankie_enabled":true,"accounts":true}' --force --site <app site id>
// (no app release needed).
export const FLAG_DEFAULTS = {
  askfrankie_enabled: true,   // AskFrankie is live in the launch build; only a literal `false` in the blob turns it off
  askfrankie_linked_login: false,
  accounts: false,        // app account creation / sign-in / Sign Out / Delete Account / AskFrankie login handoff
  cultureClub: false,     // the Culture Club tab, page and Home card, and the club days on Schedule (Schedule itself is always on)
  onboarding: false,      // the Welcome / notifications / email onboarding on a fresh install (OFF = a fresh install opens straight on Home)
  androidMonthlySupport: false,   // Android only: show the Monthly Support section on Support the Show (OFF = hidden on Android; iOS always shows it)
};

export function normalizeFlags(raw) {
  const out = { ...FLAG_DEFAULTS };
  if (raw && typeof raw === 'object') for (const k of Object.keys(FLAG_DEFAULTS)) out[k] = FLAG_DEFAULTS[k] === true ? raw[k] !== false : raw[k] === true;
  return out;
}

export async function readFlags(read = () => getJSON('qf-flags', 'flags', null)) {
  try { return normalizeFlags(await read()); } catch { return { ...FLAG_DEFAULTS }; }
}
