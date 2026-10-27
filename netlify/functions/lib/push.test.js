import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokensForPreference, getTokensForPreference } from './push.js';

const rec = (token, preferences) => ({ pushToken: token, preferences });

test('tokensForPreference: record with no substack key (pre-release device) is included', () => {
  const records = [rec('A', { live: true, video: true, club: true }), rec('B', { live: true, video: true, club: true, substack: true })];
  assert.deepEqual(tokensForPreference(records, 'substack'), ['A', 'B']);
});

test('tokensForPreference: substack:false is excluded', () => {
  const records = [rec('A', { substack: false }), rec('B', { substack: true })];
  assert.deepEqual(tokensForPreference(records, 'substack'), ['B']);
});

test('tokensForPreference: existing alerts behave as before (explicit false excluded, true included)', () => {
  const records = [rec('A', { live: true, video: false, club: true }), rec('B', { live: false, video: true, club: true })];
  assert.deepEqual(tokensForPreference(records, 'live'), ['A']);
  assert.deepEqual(tokensForPreference(records, 'video'), ['B']);
});

test('tokensForPreference: records with no preferences object, no token, or null are excluded', () => {
  const records = [{ pushToken: 'A' }, { preferences: { substack: true } }, null, rec('B', null), rec('C', {})];
  assert.deepEqual(tokensForPreference(records, 'substack'), ['C']);
});

test('getTokensForPreference: reads the store through the injected factory', async () => {
  const data = { k1: rec('A', { video: true }), k2: rec('B', { video: true, substack: false }) };
  const storeFactory = (name) => {
    assert.equal(name, 'qf-push-tokens');
    return { list: async () => ({ blobs: Object.keys(data).map((key) => ({ key })) }), get: async (key) => data[key] };
  };
  assert.deepEqual(await getTokensForPreference('substack', { storeFactory }), ['A']);
  assert.deepEqual(await getTokensForPreference('video', { storeFactory }), ['A', 'B']);
});

test('getTokensForPreference: empty store -> []', async () => {
  const storeFactory = () => ({ list: async () => ({ blobs: [] }), get: async () => null });
  assert.deepEqual(await getTokensForPreference('substack', { storeFactory }), []);
});
