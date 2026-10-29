import { getJSON } from './blobs.js';

// Remote feature flags (Blobs store `qf-flags`, key `flags`). Defaults are OFF so a missing or broken flag never turns a feature on. Flip with
//   node scripts/set-flag.mjs accounts on        (merges into the current blob; raw `blobs:set` replaces the whole object)
//   netlify blobs:set qf-flags flags '{"askfrankie_enabled":true,"accounts":true}' --force --site <app site id>
// (no app release needed). Only a literal `true` counts.
export const FLAG_DEFAULTS = {
  askfrankie_enabled: false,
  askfrankie_linked_login: false,
  accounts: false,        // app account creation / sign-in / Sign Out / Delete Account / AskFrankie login handoff
  cultureClub: false,     // the Culture Club tab, page and Home card, and the club days on Schedule (Schedule itself is always on)
  onboarding: false,      // the Welcome / notifications / email onboarding on a fresh install (OFF = a fresh install opens straight on Home)
};

export function normalizeFlags(raw) {
  const out = { ...FLAG_DEFAULTS };
  if (raw && typeof raw === 'object') for (const k of Object.keys(FLAG_DEFAULTS)) out[k] = raw[k] === true;
  return out;
}

export async function readFlags(read = () => getJSON('qf-flags', 'flags', null)) {
  try { return normalizeFlags(await read()); } catch { return { ...FLAG_DEFAULTS }; }
}
