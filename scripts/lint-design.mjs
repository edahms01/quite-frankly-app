#!/usr/bin/env node
// Design lint with a RATCHET: counts rule violations and fails only if a count goes UP versus <repo-root>/design-lint-baseline.json.
// Fixing things lowers the counts; run with --update to lock in the lower numbers. New code can never add violations.
//   node scripts/lint-design.mjs --web    <repo-root>      (AskFrankie: public/styles.css, games/games.css, legal.css)
//   node scripts/lint-design.mjs --native <repo-root>      (mobile: src/**/*.js except src/design and theme.js)
// Flags: --update (write baseline, refuses to raise a count), --force (allow raising), --list (print every hit).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const target = args.includes('--web') ? 'web' : args.includes('--native') ? 'native' : null;
const repo = args.find((a) => !a.startsWith('--'));
if (!target || !repo) { console.error('usage: lint-design.mjs --web|--native <repo-root> [--update] [--force] [--list]'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const baselinePath = join(repo, 'design-lint-baseline.json');

const tokensFile = join(repo, 'design/tokens/tokens.json');          // web repo only (the mobile repo vendors the generated files, not the source)
const T = target === 'web' ? JSON.parse(readFileSync(tokensFile, 'utf8')) : null;
const sizes = T ? new Set(Object.values(T.font.size).map((t) => t.value)) : null;          // 10 11 12 13 14 15 16 18 20 28 40
const radii = T ? new Set([0, ...Object.values(T.radius).map((t) => t.value)]) : null;     // 0 6 10 14 22 999
const durations = new Set(['0s', '.15s', '.25s', '.5s', '1s', '0.15s', '0.25s', '0.5s']);

const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.')) continue;
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));

const hits = {}; // rule -> [{file,line,text}]
const add = (rule, file, line, text) => ((hits[rule] ||= []).push({ file, line, text: text.trim().slice(0, 90) }));

if (target === 'web') {
  const files = ['public/styles.css', 'public/games/games.css', 'public/legal.css'].map((f) => join(repo, f)).filter(existsSync);
  for (const file of files) {
    const rel = relative(repo, file);
    const css = stripCss(readFileSync(file, 'utf8'));
    for (const x of css.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) add('raw-hex', rel, lineOf(css, x.index), x[0]);
    for (const x of css.matchAll(/rgba?\(\s*\d/g)) add('raw-rgba', rel, lineOf(css, x.index), css.slice(x.index, x.index + 30));
    for (const x of css.matchAll(/font-size:\s*([\d.]+)px/g)) if (!sizes.has(parseFloat(x[1]))) add('off-scale-font-size', rel, lineOf(css, x.index), x[0]);
    for (const x of css.matchAll(/font:\s*(?:[\w-]+\s+)*?([\d.]+)px/g)) if (!sizes.has(parseFloat(x[1]))) add('off-scale-font-size', rel, lineOf(css, x.index), x[0]);
    for (const x of css.matchAll(/border-radius:\s*([^;}]+)/g)) {
      const vals = x[1].trim().split(/\s+/);
      for (const v of vals) { const n = /^([\d.]+)px$/.exec(v); if (n && !radii.has(parseFloat(n[1]))) { add('off-scale-radius', rel, lineOf(css, x.index), x[0]); break; } }
    }
    for (const x of css.matchAll(/text-transform:\s*uppercase/g)) add('uppercase', rel, lineOf(css, x.index), x[0]);
    for (const x of css.matchAll(/transition:\s*([^;}]+)/g)) for (const d of x[1].matchAll(/(?<![\w.-])(\d*\.?\d+m?s)\b/g)) if (!durations.has(d[1])) add('off-scale-duration', rel, lineOf(css, x.index), x[0]);
    // red used for hover edges or link/text colour
    for (const x of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = x[1].trim(), body = x[2];
      const redRef = /(var\(--(?:accent-hi|accent|mn-hi|sp-red-hi|qf-color-brand-red-hi)\)|#c82c2a|rgba\(200,\s*44,\s*42)/;
      if (/:hover/.test(sel) && /border(?:-color)?:[^;]*/.test(body) && redRef.test((body.match(/border(?:-bottom)?(?:-color)?:[^;]*/g) || []).join(';')) && !/\.primary|\.solid|\.live|btn-primary|gate-btn:hover/.test(sel)) add('red-hover-edge', rel, lineOf(css, x.index), sel);
      const colorDecl = body.match(/(?:^|;)\s*color:\s*([^;]+)/);
      if (colorDecl && redRef.test(colorDecl[1]) && !/:focus/.test(sel)) add('red-text', rel, lineOf(css, x.index), sel);
    }
  }
} else {
  const src = join(repo, 'src');
  const files = walk(src).filter((f) => f.endsWith('.js') && !/[\\/]design[\\/]/.test(f) && !/theme\.js$/.test(f) && !/\.test\.js$/.test(f));
  for (const file of files) {
    const rel = relative(repo, file);
    const isGame = /[\\/](games)[\\/]/.test(file);
    const js = stripJs(readFileSync(file, 'utf8'));
    const g = (rule) => (isGame ? `${rule}:games` : rule);
    for (const x of js.matchAll(/['"`](#[0-9a-fA-F]{3,8})['"`]/g)) add(g('raw-hex'), rel, lineOf(js, x.index), x[1]);
    for (const x of js.matchAll(/['"`]rgba?\(/g)) add(g('raw-rgba'), rel, lineOf(js, x.index), js.slice(x.index, x.index + 30));
    for (const x of js.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)\b/g)) add(g('literal-font-size'), rel, lineOf(js, x.index), x[0]);
    for (const x of js.matchAll(/borderRadius:\s*(\d+)\b/g)) if (x[1] !== '0') add(g('literal-radius'), rel, lineOf(js, x.index), x[0]);
    for (const x of js.matchAll(/<Section\s+title="([^"]*)"/g)) if (/[A-Z]{3,}/.test(x[1]) && x[1] === x[1].toUpperCase()) add('all-caps-label', rel, lineOf(js, x.index), x[0]);
    for (const x of js.matchAll(/[^\w]color:\s*colors\.brandRed\b/g)) add('red-text', rel, lineOf(js, x.index), x[0]);
    for (const x of js.matchAll(/fontFamily\.display/g)) void x; // display is Inter Bold; allowed
  }
}

const counts = Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, v.length]).sort());
if (args.includes('--list')) for (const [rule, list] of Object.entries(hits)) { console.log(`\n## ${rule} (${list.length})`); for (const h of list) console.log(`${h.file}:${h.line}  ${h.text}`); }

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null;
if (args.includes('--update')) {
  if (baseline && !args.includes('--force')) {
    const raised = Object.keys(counts).filter((k) => counts[k] > (baseline[k] ?? 0));
    if (raised.length) { console.error('Refusing to raise a baseline: ' + raised.map((k) => `${k} ${baseline[k] ?? 0}->${counts[k]}`).join(', ') + '. Fix the new violations, or pass --force.'); process.exit(1); }
  }
  writeFileSync(baselinePath, JSON.stringify(counts, null, 2) + '\n');
  console.log('baseline written', counts);
  process.exit(0);
}
console.log('design lint', target, counts);
if (!baseline) { console.error('no baseline yet: run with --update'); process.exit(1); }
const worse = Object.keys(counts).filter((k) => counts[k] > (baseline[k] ?? 0));
if (worse.length) { console.error('NEW design violations: ' + worse.map((k) => `${k} ${baseline[k] ?? 0} -> ${counts[k]}`).join(', ') + '\nRun with --list to see them; use tokens (see qf-design-system_v1.md).'); process.exit(1); }
const better = Object.keys(baseline).filter((k) => (counts[k] ?? 0) < baseline[k]);
if (better.length) console.log('fewer violations than baseline in: ' + better.join(', ') + ' (run with --update to lock it in)');
