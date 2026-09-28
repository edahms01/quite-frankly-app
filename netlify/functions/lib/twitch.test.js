import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGenuineLiveEvent, isNewStreamId } from './twitch.js';

test('isGenuineLiveEvent: type "live" is genuine', () => {
  assert.equal(isGenuineLiveEvent({ type: 'live', id: 's1', started_at: '2026-09-28T20:00:00Z' }), true);
});

for (const type of ['playlist', 'watchparty', 'premiere', 'rerun']) {
  test(`isGenuineLiveEvent: type "${type}" is not genuine`, () => {
    assert.equal(isGenuineLiveEvent({ type, id: 's1' }), false);
  });
}

test('isGenuineLiveEvent: missing event is not genuine', () => {
  assert.equal(isGenuineLiveEvent(undefined), false);
  assert.equal(isGenuineLiveEvent(null), false);
  assert.equal(isGenuineLiveEvent({}), false);
});

test('isNewStreamId: id not previously processed is new', () => {
  assert.equal(isNewStreamId(['a', 'b'], 'c'), true);
});

test('isNewStreamId: id already processed is not new (de-dupe)', () => {
  assert.equal(isNewStreamId(['a', 'b'], 'b'), false);
});

test('isNewStreamId: empty processed list treats any id as new', () => {
  assert.equal(isNewStreamId([], 'a'), true);
});
