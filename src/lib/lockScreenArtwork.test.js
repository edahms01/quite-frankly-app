import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isArtworkUri, lockScreenMetadata, resolveArtworkUri } from './lockScreenArtwork.js';

test('isArtworkUri: only schemes the native URL classes can open', () => {
  for (const ok of ['https://x.test/a.png', 'http://localhost:8082/assets/icon.png', 'file:///data/user/0/tv.quitefrankly.app/cache/ExponentAsset-1.png', 'file:///var/containers/Bundle/a.app/assets/icon.png']) assert.equal(isArtworkUri(ok), true, ok);
  for (const bad of ['assets_icon', 'src_assets_images_quitefranklylogofinal', 'android.resource://tv.quitefrankly.app/drawable/assets_icon', 'file:///android_res/drawable/assets_icon.png'.replace('file', 'content'), 'data:image/png;base64,AAAA', '', null, undefined, 42, 'http://', 'file://']) assert.equal(isArtworkUri(bad), false, String(bad));
});

test('dev client / iOS: a usable URI is returned as is, nothing is copied', async () => {
  let copied = false;
  const copyToCache = async () => { copied = true; return 'file:///x.png'; };
  assert.equal(await resolveArtworkUri({ asset: { uri: 'http://localhost:8082/assets/icon.png' }, platform: 'android', copyToCache }), 'http://localhost:8082/assets/icon.png');
  assert.equal(await resolveArtworkUri({ asset: { uri: 'file:///var/containers/Bundle/a.app/assets/icon.png' }, platform: 'ios', copyToCache }), 'file:///var/containers/Bundle/a.app/assets/icon.png');
  assert.equal(copied, false);
});

test('Android release: a bare drawable name is copied to the cache and the file:// URL is used', async () => {
  const calls = [];
  const copyToCache = async (uri, hash, type) => { calls.push([uri, hash, type]); return 'file:///data/user/0/tv.quitefrankly.app/cache/ExponentAsset-abc.png'; };
  const uri = await resolveArtworkUri({ asset: { uri: 'assets_icon', hash: 'abc', type: 'png' }, platform: 'android', copyToCache });
  assert.equal(uri, 'file:///data/user/0/tv.quitefrankly.app/cache/ExponentAsset-abc.png');
  assert.deepEqual(calls, [['assets_icon', 'abc', 'png']]);
  // file:///android_res/ is a resource path the native URL class cannot open either: copied too
  assert.equal(await resolveArtworkUri({ asset: { uri: 'file:///android_res/drawable/assets_icon.png', hash: null, type: 'png' }, platform: 'android', copyToCache }), 'file:///data/user/0/tv.quitefrankly.app/cache/ExponentAsset-abc.png');
});

test('never throws and never returns an unusable URI: failure = null', async () => {
  const bad = async () => 'assets_icon';
  const boom = async () => { throw new Error('native failed'); };
  assert.equal(await resolveArtworkUri({ asset: { uri: 'assets_icon' }, platform: 'android', copyToCache: bad }), null);
  assert.equal(await resolveArtworkUri({ asset: { uri: 'assets_icon' }, platform: 'android', copyToCache: boom }), null);
  assert.equal(await resolveArtworkUri({ asset: { uri: 'assets_icon' }, platform: 'ios', copyToCache: async () => 'file:///x' }), null);   // iOS never needs the Android copy
  assert.equal(await resolveArtworkUri({ asset: { uri: 'assets_icon' }, platform: 'android' }), null);
  assert.equal(await resolveArtworkUri({ asset: null, platform: 'android' }), null);
  assert.equal(await resolveArtworkUri({}), null);
});

test('lockScreenMetadata: artworkUrl only when it is a usable URI (the crash was a bare resource name in artworkUrl)', () => {
  assert.deepEqual(lockScreenMetadata({ title: 'T', artworkUri: 'file:///c/a.png' }), { title: 'T', artist: 'Quite Frankly', artworkUrl: 'file:///c/a.png' });
  assert.deepEqual(lockScreenMetadata({ title: 'T', artworkUri: 'src_assets_images_quitefranklylogofinal' }), { title: 'T', artist: 'Quite Frankly' });
  assert.deepEqual(lockScreenMetadata({ title: 'T', artworkUri: null }), { title: 'T', artist: 'Quite Frankly' });
});

test('wiring: the context uses the helper, not a raw resolveAssetSource uri; artwork is the app icon by path', () => {
  const ctx = readFileSync(new URL('../context/AudioPlayerContext.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ctx, /resolveAssetSource|artworkUrl:/);
  assert.match(ctx, /lockScreenMetadata\(/);
  assert.match(ctx, /try \{\s*player\.setActiveForLockScreen/);
  const native = readFileSync(new URL('./lockScreenArtworkNative.js', import.meta.url), 'utf8');
  assert.match(native, /require\('\.\.\/\.\.\/assets\/icon\.png'\)/);
});
