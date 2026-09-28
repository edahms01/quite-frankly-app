import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyVideo, pickMostRecentItem, UPCOMING_WINDOW_MS } from './youtube.js';

test('classifyVideo: liveBroadcastContent "upcoming" is upcoming, not live', async () => {
  const result = await classifyVideo({
    videoId: 'v1',
    durationSeconds: 0,
    liveBroadcastContent: 'upcoming',
    hasLiveStreamingDetails: true,
  });
  assert.equal(result, 'upcoming');
});

test('classifyVideo: liveBroadcastContent "live" is live', async () => {
  const result = await classifyVideo({
    videoId: 'v2',
    durationSeconds: 0,
    liveBroadcastContent: 'live',
    hasLiveStreamingDetails: true,
  });
  assert.equal(result, 'live');
});

test('classifyVideo: past livestream (liveBroadcastContent "none", has liveStreamingDetails) is live', async () => {
  const result = await classifyVideo({
    videoId: 'v3',
    durationSeconds: 5400,
    liveBroadcastContent: 'none',
    hasLiveStreamingDetails: true,
  });
  assert.equal(result, 'live');
});

test('classifyVideo: regular long-form upload is video', async () => {
  const result = await classifyVideo({
    videoId: 'v4',
    durationSeconds: 600,
    liveBroadcastContent: 'none',
    hasLiveStreamingDetails: false,
  });
  assert.equal(result, 'video');
});

const NOW = new Date('2026-09-28T12:00:00Z').getTime();

function archiveMap(entries) {
  const map = new Map(entries.map((e) => [e.id, e]));
  return (id) => map.get(id);
}

test('pickMostRecentItem: upcoming item far out (4h) is skipped, newest real item wins', () => {
  const items = [{ id: 'pre' }, { id: 'real' }];
  const getArchived = archiveMap([
    { id: 'pre', contentType: 'upcoming', scheduledStartTime: '2026-09-28T16:00:00Z' },
    { id: 'real', contentType: 'video' },
  ]);
  assert.deepEqual(pickMostRecentItem(items, getArchived, NOW), { id: 'real' });
});

test('pickMostRecentItem: upcoming item due soon (1h) wins even though it is not items[0]', () => {
  // Regression case: a newer, unrelated video (e.g. a Short posted while the
  // pre-load sits waiting) must not bump the due-soon pre-load out of the slot.
  const items = [{ id: 'newerReal' }, { id: 'pre' }];
  const getArchived = archiveMap([
    { id: 'newerReal', contentType: 'video' },
    { id: 'pre', contentType: 'upcoming', scheduledStartTime: '2026-09-28T13:00:00Z' },
  ]);
  assert.deepEqual(pickMostRecentItem(items, getArchived, NOW), { id: 'pre' });
});

test('pickMostRecentItem: upcoming item exactly at the window boundary wins', () => {
  const items = [{ id: 'real' }, { id: 'pre' }];
  const getArchived = archiveMap([
    { id: 'real', contentType: 'video' },
    { id: 'pre', contentType: 'upcoming', scheduledStartTime: new Date(NOW + UPCOMING_WINDOW_MS).toISOString() },
  ]);
  assert.deepEqual(pickMostRecentItem(items, getArchived, NOW), { id: 'pre' });
});

test('pickMostRecentItem: upcoming item already past its scheduledStartTime still wins over an older real item', () => {
  const items = [{ id: 'olderReal' }, { id: 'pre' }];
  const getArchived = archiveMap([
    { id: 'olderReal', contentType: 'video' },
    { id: 'pre', contentType: 'upcoming', scheduledStartTime: '2026-09-28T10:00:00Z' },
  ]);
  assert.deepEqual(pickMostRecentItem(items, getArchived, NOW), { id: 'pre' });
});

test('pickMostRecentItem: upcoming item with no scheduledStartTime never wins, falls back to newest real', () => {
  const items = [{ id: 'pre' }, { id: 'real' }];
  const getArchived = archiveMap([
    { id: 'pre', contentType: 'upcoming', scheduledStartTime: null },
    { id: 'real', contentType: 'video' },
  ]);
  assert.deepEqual(pickMostRecentItem(items, getArchived, NOW), { id: 'real' });
});

test('pickMostRecentItem: no upcoming items at all, picks the newest (first) item', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  const getArchived = archiveMap([
    { id: 'a', contentType: 'video' },
    { id: 'b', contentType: 'live' },
  ]);
  assert.deepEqual(pickMostRecentItem(items, getArchived, NOW), { id: 'a' });
});

test('pickMostRecentItem: item missing from the archive entirely is never treated as upcoming', () => {
  const items = [{ id: 'unarchived' }];
  const getArchived = archiveMap([]);
  assert.deepEqual(pickMostRecentItem(items, getArchived, NOW), { id: 'unarchived' });
});

test('pickMostRecentItem: empty items list returns null', () => {
  assert.equal(pickMostRecentItem([], archiveMap([]), NOW), null);
});
