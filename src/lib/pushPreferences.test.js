import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFERENCES, mergePreferences } from './pushPreferences.js';

test('defaults include substack ON', () => {
  assert.deepEqual(DEFAULT_PREFERENCES, { live: true, video: true, substack: true });
});

test('old stored prefs with no substack key merge to substack ON, keeping the user\'s other choices', () => {
  const merged = mergePreferences(JSON.stringify({ live: true, video: false, club: true }));
  assert.deepEqual(merged, { live: true, video: false, club: true, substack: true });
});

test('stored substack:false is respected', () => {
  assert.equal(mergePreferences(JSON.stringify({ substack: false })).substack, false);
});

test('nothing stored / bad JSON / non-object -> defaults (and a copy, not the shared object)', () => {
  for (const raw of [null, undefined, '', '{not json', '"str"', '[1]', 'null']) {
    const merged = mergePreferences(raw);
    assert.deepEqual(merged, DEFAULT_PREFERENCES);
    assert.notEqual(merged, DEFAULT_PREFERENCES);
  }
});
