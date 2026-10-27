#!/usr/bin/env node
// Flip one remote feature flag without wiping the others.
//   node scripts/set-flag.mjs accounts on [--site <netlify site id>]
//   node scripts/set-flag.mjs cultureClub off
//   node scripts/set-flag.mjs --show
// Reads the current Blobs value (store qf-flags, key flags) with the Netlify CLI, changes ONE key, writes the whole object back (raw
// `netlify blobs:set` replaces the entire object, so setting one flag by hand would turn the others off). The store is site-wide: this changes
// PRODUCTION for every user. Never use it for screenshots or tests (use EXPO_PUBLIC_FLAGS_OVERRIDE in a dev build). Prints flag names and values only.
import { spawnSync } from 'node:child_process';
import { FLAG_DEFAULTS } from '../src/lib/featureFlags.js';

const args = process.argv.slice(2);
const siteIdx = args.indexOf('--site');
const site = siteIdx >= 0 ? args.splice(siteIdx, 2)[1] : null;
const siteArgs = site ? ['--site', site] : [];
const run = (cmdArgs) => spawnSync('netlify', cmdArgs, { encoding: 'utf8' });

function current() {
  const r = run(['blobs:get', 'qf-flags', 'flags', ...siteArgs]);
  if (r.status !== 0 || !r.stdout.trim()) return {};
  try { return JSON.parse(r.stdout); } catch { return {}; }
}
const show = (flags) => Object.keys(FLAG_DEFAULTS).map((k) => `  ${k}: ${flags[k] === true ? 'ON' : 'off'}`).join('\n');

if (args[0] === '--show') { console.log('current flags:\n' + show(current())); process.exit(0); }
const [name, state] = args;
if (!(name in FLAG_DEFAULTS) || !['on', 'off'].includes(state)) {
  console.error(`usage: node scripts/set-flag.mjs <${Object.keys(FLAG_DEFAULTS).join('|')}> <on|off> [--site <id>]   (or --show)`);
  process.exit(1);
}
const next = {};
const cur = current();
for (const k of Object.keys(FLAG_DEFAULTS)) next[k] = cur[k] === true;
next[name] = state === 'on';
const r = run(['blobs:set', 'qf-flags', 'flags', JSON.stringify(next), '--force', ...siteArgs]);
if (r.status !== 0) { console.error('blobs:set failed (is the folder linked, or pass --site?)'); process.exit(1); }
console.log(`${name} -> ${state}\nflags now:\n` + show(next));
