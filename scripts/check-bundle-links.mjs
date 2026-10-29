#!/usr/bin/env node
// Guard: build the JS bundles (Android and iOS) with a local Metro export (NOT an EAS build) and fail if they contain a payment / donation / membership
// domain, a crypto address, a deny-listed phrase or a string from a removed screen. Rules: src/config/paymentDenyList.js + scripts/lib/bundleScan.mjs.
// Usage: npm run check:bundle            (builds into a temp folder, then scans)
//        node scripts/check-bundle-links.mjs --dir <export folder>   (scan an existing `expo export` output, no build)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanBundle } from './lib/bundleScan.mjs';

const args = process.argv.slice(2);
const dirArg = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null;
const allow = JSON.parse(readFileSync(new URL('./bundle-allowlist.json', import.meta.url), 'utf8')).allow;

const outDir = dirArg ?? mkdtempSync(join(tmpdir(), 'qf-bundle-check-'));
try {
  if (!dirArg) {
    console.log('Building Android + iOS bundles (local Metro export, no EAS)...');
    execFileSync('npx', ['expo', 'export', '--platform', 'android', '--platform', 'ios', '--no-bytecode', '--output-dir', outDir], { stdio: 'inherit' });
  }
  const jsFiles = (platform) => {
    const d = join(outDir, '_expo', 'static', 'js', platform);
    return readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => join(d, f));
  };
  let failed = false;
  for (const platform of ['android', 'ios']) {
    const files = jsFiles(platform);
    if (files.length === 0) throw new Error(`no ${platform} bundle found in ${outDir}`);
    for (const file of files) {
      const r = scanBundle(readFileSync(file, 'utf8'), allow);
      const kb = Math.round(statSync(file).size / 1024);
      console.log(`${platform}: ${kb} KB, ${r.skipped} config module(s) skipped, ${r.allowed.length} allowed, ${r.hits.length} violation(s)`);
      for (const h of r.hits) console.log(`  [${h.kind}] ${h.match}  ...${h.context}...`);
      if (r.hits.length) failed = true;
    }
  }
  console.log(failed ? 'FAIL: payment / removed-screen strings found in the bundle.' : 'PASS: no payment domain, crypto address, deny-listed phrase or removed-screen string in either bundle.');
  process.exitCode = failed ? 1 : 0;
} finally {
  if (!dirArg) rmSync(outDir, { recursive: true, force: true });
}
