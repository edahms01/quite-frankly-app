import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allowBandcampNavigation, BANDCAMP_EMBED_URL } from './bandcampEmbed.js';

test('embed uses the one-row small layout (no buy / share footer), not large / medium', () => {
  assert.match(BANDCAMP_EMBED_URL, /\/size=small\//);
  assert.doesNotMatch(BANDCAMP_EMBED_URL, /size=(large|medium)/);
});

test('only the player document loads; album, purchase, share and any other page are refused', () => {
  assert.equal(allowBandcampNavigation(BANDCAMP_EMBED_URL), true);
  assert.equal(allowBandcampNavigation('about:blank'), true);
  for (const u of ['https://settheCharge.bandcamp.com/album/sky-goes-on', 'https://bandcamp.com/EmbeddedPlayerX', 'https://bandcamp.com/', 'https://bandcamp.com/cart', 'https://paypal.com/x', undefined, null, 42]) {
    assert.equal(allowBandcampNavigation(u), false, String(u));
  }
});

test('Jam wires the guard onto the Bandcamp WebView', () => {
  const src = readFileSync(new URL('../screens/home/Music.js', import.meta.url), 'utf8');
  assert.match(src, /source=\{\{ uri: BANDCAMP_EMBED_URL \}\}[\s\S]*onShouldStartLoadWithRequest=\{\(request\) => allowBandcampNavigation\(request\.url\)\}/);
  assert.match(src, /setSupportMultipleWindows=\{false\}/);
});
