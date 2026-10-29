import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { upgradeToHttps } from './mediaUrl.js';

test('the real episode URL shape: chrt.fm wrapper with an inner http:// address is upgraded and keeps the tracker', () => {
  assert.equal(
    upgradeToHttps('https://chrt.fm/track/CE2636/http://feeds.soundcloud.com/stream/2428199640-quite-frankly-podcast-the-enemies-we-needed-to.mp3'),
    'https://chrt.fm/track/CE2636/https://feeds.soundcloud.com/stream/2428199640-quite-frankly-podcast-the-enemies-we-needed-to.mp3'
  );
});

test('plain http:// is upgraded; https and everything else is left alone', () => {
  assert.equal(upgradeToHttps('http://example.com/a.mp3'), 'https://example.com/a.mp3');
  assert.equal(upgradeToHttps('HTTP://example.com/a.mp3'), 'https://example.com/a.mp3');
  for (const same of ['https://example.com/a.mp3', 'https://chrt.fm/track/x/https://feeds.soundcloud.com/a.mp3', 'file:///a.mp3', 'content://x/y', '', 'not a url']) assert.equal(upgradeToHttps(same), same);
  assert.equal(upgradeToHttps(undefined), undefined);
  assert.equal(upgradeToHttps(null), null);
  assert.equal(upgradeToHttps(42), 42);
});

test('does not rewrite an http:// that is only part of a query value or text', () => {
  assert.equal(upgradeToHttps('https://a.test/p?next=http://b.test'), 'https://a.test/p?next=http://b.test');
});

test('wiring: the player loads the upgraded URL', () => {
  const ctx = readFileSync(new URL('../context/AudioPlayerContext.js', import.meta.url), 'utf8');
  assert.match(ctx, /player\.replace\(\{ uri: upgradeToHttps\(episode\.audioUrl\) \}\)/);
});
