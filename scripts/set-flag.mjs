#!/usr/bin/env node
// Flip one remote feature flag without wiping the others.
//   node scripts/set-flag.mjs accounts on [--site <netlify site id>]
//   node scripts/set-flag.mjs websiteLink off
//   node scripts/set-flag.mjs --show
// Reads the current Blobs value (store qf-flags, key flags) with the Netlify CLI, changes ONE key, writes the whole object back (raw
// `netlify blobs:set` replaces the entire object, so setting one flag by hand would turn the others off). The store is site-wide: this changes
// PRODUCTION for every user. Never use it for screenshots or tests (use EXPO_PUBLIC_FLAGS_OVERRIDE in a dev build). Prints flag names and values only.
import { spawnSync } from 'node:child_process';
import { FLAG_DEFAULTS, normalizeFlags } from '../src/lib/featureFlags.js';

const args = process.argv.slice(2);
const siteIdx = args.indexOf('--site');
const site = siteIdx >= 0 ? args.splice(siteIdx, 2)[1] : null;
// `netlify blobs:get/set` have no --site option; the CLI reads the site from the linked folder or from NETLIFY_SITE_ID, so --site sets that variable.
const run = (cmdArgs) => spawnSync('netlify', cmdArgs, { encoding: 'utf8', env: site ? { ...process.env, NETLIFY_SITE_ID: site } : process.env });

function current() {
  const r = run(['blobs:get', 'qf-flags', 'flags', ]);
  const out = (r.stdout || '').trim();
  // A failed read (folder not linked to the app site, offline, auth) must NEVER look like "no flags": writing back a blob built from defaults would overwrite the real flags.
  if (r.error || r.status !== 0 || /linked to a project|netlify link|Error:/i.test(`${r.stderr || ''}\n${out}`)) {
    console.error('Could not read the current flags (is this folder linked to the app Netlify site? pass --site <id>). Nothing was changed.');
    process.exit(1);
  }
  if (!out) return {};      // the key genuinely does not exist yet
  try { return JSON.parse(out); } catch { console.error('The current flags are not valid JSON; refusing to overwrite them. Nothing was changed.'); process.exit(1); }
}
// effective values (what the app gets): a default-ON flag with no key in the blob is ON, shown as "(default)"
const show = (flags) => { const eff = normalizeFlags(flags); return Object.keys(FLAG_DEFAULTS).map((k) => `  ${k}: ${eff[k] ? 'ON' : 'off'}${k in flags ? '' : ' (default)'}`).join('\n'); };

if (args[0] === '--show') { console.log('current flags:\n' + show(current())); process.exit(0); }
const [name, state] = args;
if (!(name in FLAG_DEFAULTS) || !['on', 'off'].includes(state)) {
  console.error(`usage: node scripts/set-flag.mjs <${Object.keys(FLAG_DEFAULTS).join('|')}> <on|off> [--site <id>]   (or --show)`);
  process.exit(1);
}
const next = {};
const cur = current();
// merge: keep every key as it is; a key that is absent keeps its default (so a default-ON flag is never silently written as false)
for (const k of Object.keys(FLAG_DEFAULTS)) next[k] = k in cur ? cur[k] === true || (FLAG_DEFAULTS[k] === true && cur[k] !== false) : FLAG_DEFAULTS[k];
next[name] = state === 'on';
const r = run(['blobs:set', 'qf-flags', 'flags', JSON.stringify(next), '--force']);
if (r.status !== 0) { console.error('blobs:set failed (is the folder linked, or pass --site?)'); process.exit(1); }
console.log(`${name} -> ${state}\nflags now:\n` + show(next));
