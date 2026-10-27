#!/usr/bin/env node
// Copies the shared design files from the AskFrankie checkout into src/design/ (vendored, so builds never depend on another repo).
//   npm run sync:tokens           copy
//   npm run sync:tokens -- --check   exit 1 if the vendored copy differs from the source (skipped, with a warning, if the AskFrankie checkout is not found)
// Source folder, first that exists: $QF_DESIGN_DIR, ../AskFrankie/design, ../AskFrankieBranded/design (sibling checkouts), then the same two one level up (when this repo is a git worktree under ../qf-worktrees/).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  process.env.QF_DESIGN_DIR,
  join(root, '..', 'AskFrankie', 'design'),
  join(root, '..', 'AskFrankieBranded', 'design'),
  join(root, '..', '..', 'AskFrankie', 'design'),
  join(root, '..', '..', 'AskFrankieBranded', 'design'),
].filter(Boolean).map((d) => resolve(d));
const srcDir = candidates.find((d) => existsSync(join(d, 'dist', 'qf-tokens.mobile.js'))) || candidates[0];
const pairs = [
  [join(srcDir, 'dist', 'qf-tokens.mobile.js'), join(root, 'src', 'design', 'qf-tokens.mobile.js')],
  [join(srcDir, 'native', 'qf-presets.js'), join(root, 'src', 'design', 'qf-presets.js')],
];
const check = process.argv.includes('--check');
if (!existsSync(pairs[0][0])) {
  const msg = `design source not found (looked in: ${candidates.join(', ')}). Set QF_DESIGN_DIR, or check out AskFrankie next to this repo`;
  if (check) { console.warn('sync-tokens: ' + msg + ' - check skipped'); process.exit(0); }
  console.error('sync-tokens: ' + msg); process.exit(1);
}
let stale = 0;
for (const [from, to] of pairs) {
  const text = readFileSync(from, 'utf8');
  if (check) { if (!existsSync(to) || readFileSync(to, 'utf8') !== text) { console.error('STALE: ' + to); stale++; } continue; }
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, text);
  console.log('synced ' + to.replace(root + '/', ''));
}
if (check) { if (stale) { console.error('Run: npm run sync:tokens'); process.exit(1); } console.log('sync-tokens: vendored design files are up to date'); }
