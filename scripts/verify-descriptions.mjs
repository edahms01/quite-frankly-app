#!/usr/bin/env node
// One-off verification (READ-ONLY: GET requests only, nothing is written anywhere). Pages through every description the production feed endpoints return,
// runs the same sanitizeDescription the app uses, and reports how many items change and whether any payment text is left.
// Usage: node scripts/verify-descriptions.mjs [--base https://quite-frankly-app.netlify.app] [--show 5]
// Exit code 1 if any deny-list hit survives sanitizing (the broader keyword scan is for a human to read, it never fails the run).
import { findPaymentHits, sanitizeDescription } from '../src/lib/sanitizeDescription.js';

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const BASE = opt('--base', 'https://quite-frankly-app.netlify.app').replace(/\/$/, '');
const SHOW = Number(opt('--show', 5));
const FN = `${BASE}/.netlify/functions`;
const norm = (t) => (t ?? '').trim().replace(/\n{3,}/g, '\n\n');

async function get(path) {
  const res = await fetch(`${FN}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function paged(endpoint) {
  const items = [];
  for (let offset = 0; ; offset += 50) {
    const page = await get(`${endpoint}?offset=${offset}&limit=50`);
    items.push(...page.episodes);
    if (!page.hasMore || page.episodes.length === 0) break;
  }
  return items;
}

const sources = [
  { name: 'YouTube archive (get-youtube-episodes)', items: await paged('get-youtube-episodes'), fields: ['description'] },
  { name: 'SoundCloud (get-soundcloud-episodes)', items: await paged('get-soundcloud-episodes'), fields: ['description', 'descriptionFull'] },
];
const feed = await get('get-youtube-feed');
sources.push({ name: 'Home most-recent (get-youtube-feed)', items: [feed.mostRecent].flat().filter(Boolean), fields: ['description'] });

// Broader words a human should eyeball in what is LEFT (not a failure): they can be ordinary show content.
const BROAD = /patreon|paypal|donat|crypto|bitcoin|\bbtc\b|\bxrp\b|\btip\b|\bsupport\b|subscribe|member|sponsor|venmo|cash ?app|culture club/i;

let residualDeny = 0;
for (const src of sources) {
  let changed = 0; let withHits = 0; let emptied = 0; let residual = 0; const reasons = {}; const examples = []; const broad = new Map();
  for (const item of src.items) {
    for (const field of src.fields) {
      const before = item[field] ?? '';
      const hits = findPaymentHits(before);
      const after = sanitizeDescription(before);
      if (hits.length) { withHits++; for (const h of hits) reasons[h.reason.split(':')[0]] = (reasons[h.reason.split(':')[0]] || 0) + 1; }
      if (after !== norm(before)) { changed++; if (!after && before.trim()) emptied++; if (examples.length < SHOW) examples.push({ id: item.id ?? item.guid, field, before: before.slice(0, 160), after: after.slice(0, 160) }); }
      const left = findPaymentHits(after);
      if (left.length) { residual += left.length; console.log(`  RESIDUAL in ${item.id ?? item.guid}.${field}:`, left); }
      for (const line of after.split('\n')) if (BROAD.test(line)) broad.set(line.trim().slice(0, 140), (broad.get(line.trim().slice(0, 140)) || 0) + 1);
    }
  }
  residualDeny += residual;
  console.log(`\n== ${src.name}: ${src.items.length} items (fields: ${src.fields.join(', ')})`);
  console.log(`   items-fields with payment text: ${withHits}; changed: ${changed}; fully emptied: ${emptied}; residual deny-list hits after sanitizing: ${residual}`);
  console.log('   removed-line reasons:', reasons);
  for (const e of examples) console.log(`   e.g. ${e.id}.${e.field}\n     before: ${JSON.stringify(e.before)}\n     after:  ${JSON.stringify(e.after)}`);
  if (broad.size) { console.log(`   broader keyword lines still present (${broad.size} distinct; read these):`); for (const [l, n] of [...broad].slice(0, 25)) console.log(`     x${n} ${l}`); }
}
console.log(residualDeny === 0 ? '\nPASS: zero residual deny-list hits.' : `\nFAIL: ${residualDeny} residual deny-list hit(s).`);
process.exitCode = residualDeny === 0 ? 0 : 1;
