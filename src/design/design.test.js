// Guardrails for the design system (docs: qf-design-system_v1.md). Runs with `npm test`.
// The vendored token file imports react-native, so it is checked as TEXT here, not imported.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const tokens = readFileSync(new URL('./qf-tokens.mobile.js', import.meta.url), 'utf8');

test('theme keeps every legacy key the 84 screens use', () => {
  for (const k of ['brandRed', 'accentGold', 'surfaceGround', 'surfaceCard', 'surfaceLine', 'surfaceLive', 'inkPrimary', 'inkMuted', 'typeShort', 'typeVideo', 'typeStream']) {
    assert.match(tokens, new RegExp(`"${k}":`), `colors.${k} is missing`);
  }
  for (const k of ['xs', 'sm', 'md', 'lg', 'xl']) assert.match(tokens, new RegExp(`"${k}": \\d+`));
  assert.match(tokens, /export const shadows/);
});

test('radius is the five-step scale', () => {
  const m = /export const radius = (\{[^}]*\})/.exec(tokens);
  assert.deepEqual(JSON.parse(m[1]), { sm: 6, md: 10, lg: 14, xl: 22, pill: 999 });
});

test('vendored copy matches the AskFrankie source (skipped when the sibling checkout is absent)', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-tokens.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('no NEW design violations (ratchet; fix new ones, never raise the baseline)', () => {
  const r = spawnSync(process.execPath, ['scripts/lint-design.mjs', '--native', '.'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
