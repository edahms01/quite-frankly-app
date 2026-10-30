import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyboardOverlap } from './keyboardOverlap.js';

test('keyboard reaching into the container: overlap = how far it reaches', () => {
  assert.equal(keyboardOverlap({ containerBottom: 2274, keyboardTop: 1517 }), 757);
  assert.equal(keyboardOverlap({ containerBottom: 800.4, keyboardTop: 500 }), 300);
});

test('no overlap (keyboard below the container, equal, or hidden) and bad input are 0', () => {
  assert.equal(keyboardOverlap({ containerBottom: 1000, keyboardTop: 1000 }), 0);
  assert.equal(keyboardOverlap({ containerBottom: 1000, keyboardTop: 1500 }), 0);
  for (const v of [undefined, null, NaN, 'x']) {
    assert.equal(keyboardOverlap({ containerBottom: v, keyboardTop: 1 }), 0);
    assert.equal(keyboardOverlap({ containerBottom: 1, keyboardTop: v }), 0);
  }
});

test('AskFrankie pads its WebView by the overlap on Android only', () => {
  const src = readFileSync(new URL('../screens/home/AskFrankie.js', import.meta.url), 'utf8');
  assert.ok(src.includes("Platform.OS !== 'android'"));
  assert.match(src, /keyboardOverlap\(/);
  assert.ok(src.includes('{ paddingBottom: keyboardPad }'));
});
