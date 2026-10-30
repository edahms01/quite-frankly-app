import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANDROID_CONTENT_HEIGHT, tabBarMetrics } from './tabBarMetrics.js';

test('iOS is unchanged: height 49 + inset, paddingTop md, paddingBottom = inset (xs when no inset)', () => {
  assert.deepEqual(tabBarMetrics({ platform: 'ios', bottomInset: 34 }), { height: 83, paddingTop: 16, paddingBottom: 34 });
  assert.deepEqual(tabBarMetrics({ platform: 'ios', bottomInset: 0 }), { height: 49, paddingTop: 16, paddingBottom: 4 });
});

test('Android: a fixed 64 dp content area above the inset, for gesture (~24 dp) and 3-button (~42 dp) navigation', () => {
  for (const inset of [0, 16, 24, 42, 48]) {
    const m = tabBarMetrics({ platform: 'android', bottomInset: inset });
    assert.equal(m.height - (m.paddingBottom === 4 && inset === 0 ? 0 : inset), ANDROID_CONTENT_HEIGHT, `inset ${inset}`);
    assert.equal(m.paddingTop, 8);
    // content area (height - paddingTop - paddingBottom) holds icon 24 + label ~14 + library margin ~8 + gap with room to spare
    assert.ok(m.height - m.paddingTop - m.paddingBottom >= 46, `inset ${inset}`);
  }
  assert.ok(tabBarMetrics({ platform: 'android', bottomInset: 42 }).height > tabBarMetrics({ platform: 'android', bottomInset: 24 }).height);
});

test('bad inset values fall back to 0', () => {
  for (const v of [undefined, null, NaN, -5, 'x']) assert.equal(tabBarMetrics({ platform: 'android', bottomInset: v }).height, ANDROID_CONTENT_HEIGHT);
});

test('MainTabNavigator uses the helper with Platform.OS and the real inset', () => {
  const src = readFileSync(new URL('../navigation/MainTabNavigator.js', import.meta.url), 'utf8');
  assert.match(src, /tabBarMetrics\(\{ platform: Platform\.OS, bottomInset: insets\.bottom/);
});
