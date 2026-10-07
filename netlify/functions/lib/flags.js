import { getJSON } from './blobs.js';

// Remote feature flags (Blobs store `qf-flags`, key `flags`). Defaults are OFF so a missing or broken flag never turns a feature on. Flip with
//   netlify blobs:set qf-flags flags '{"askfrankie_enabled":true,"askfrankie_linked_login":true}' --site <app site id>
// (no app release needed). Only a literal `true` counts.
export const FLAG_DEFAULTS = { askfrankie_enabled: false, askfrankie_linked_login: false };

export function normalizeFlags(raw) {
  const out = { ...FLAG_DEFAULTS };
  if (raw && typeof raw === 'object') for (const k of Object.keys(FLAG_DEFAULTS)) out[k] = raw[k] === true;
  return out;
}

export async function readFlags(read = () => getJSON('qf-flags', 'flags', null)) {
  try { return normalizeFlags(await read()); } catch { return { ...FLAG_DEFAULTS }; }
}
