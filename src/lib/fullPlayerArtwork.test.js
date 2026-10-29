import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const src = readFileSync(new URL('../screens/modal/FullPlayer.js', import.meta.url), 'utf8');

test('FullPlayer shows the app icon (by path) instead of an empty placeholder View', () => {
  assert.match(src, /<Image source=\{require\('\.\.\/\.\.\/\.\.\/assets\/icon\.png'\)\} style=\{styles\.artwork\}/);
  assert.doesNotMatch(src, /<View style=\{styles\.artwork\} \/>/);
  assert.ok(existsSync(new URL('../../assets/icon.png', import.meta.url)), 'assets/icon.png must exist');
});
