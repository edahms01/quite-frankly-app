import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyVideo, buildFeedCache, pickMostRecent, pickMostRecentItem, pickTonightsStream, UPCOMING_WINDOW_MS } from './youtube.js';

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

test('pickTonightsStream: returns the pre-load whether it is still upcoming or already reclassified live', () => {
  const archive = [
    { id: 'short', contentType: 'short', scheduledStartTime: null },
    { id: 'pre', contentType: 'live', scheduledStartTime: '2026-09-28T12:00:00Z' },
  ];
  assert.equal(pickTonightsStream(archive, NOW).id, 'pre');
  archive[1].contentType = 'upcoming';
  assert.equal(pickTonightsStream(archive, NOW).id, 'pre');
});

test('pickTonightsStream: ignores yesterday\'s finished live stream, picks the one closest to now', () => {
  const archive = [
    { id: 'yesterday', contentType: 'live', scheduledStartTime: '2026-09-27T12:00:00Z' },
    { id: 'tonight', contentType: 'upcoming', scheduledStartTime: '2026-09-28T13:00:00Z' },
  ];
  assert.equal(pickTonightsStream(archive, NOW).id, 'tonight');
});

test('pickTonightsStream: nothing scheduled near now returns null', () => {
  const archive = [{ id: 'old', contentType: 'live', scheduledStartTime: '2026-09-27T12:00:00Z' }];
  assert.equal(pickTonightsStream(archive, NOW), null);
  assert.equal(pickTonightsStream([], NOW), null);
});

// pickMostRecent: Twitch-live pin on top of the existing due-soon / newest-real rules.

test('pickMostRecent: Twitch live pins tonight\'s stream even after the pre-load flipped to live and a newer Short sits above it in RSS', () => {
  // Regression (2026-09-30): the poll that reclassified the pre-load 'upcoming' -> 'live'
  // ended its due-soon priority, and the Short listed above it in RSS took the slot.
  const items = [{ id: 'short' }, { id: 'pre' }];
  const archive = [
    { id: 'short', contentType: 'short', scheduledStartTime: null },
    { id: 'pre', contentType: 'live', scheduledStartTime: '2026-09-28T12:00:00Z' },
  ];
  assert.equal(pickMostRecent({ items, archive, isLive: true, now: NOW }).id, 'pre');
});

test('pickMostRecent: not live falls through to the existing rules unchanged', () => {
  const items = [{ id: 'short' }, { id: 'pre' }];
  const archive = [
    { id: 'short', contentType: 'short' },
    { id: 'pre', contentType: 'live', scheduledStartTime: '2026-09-28T12:00:00Z' },
  ];
  assert.equal(pickMostRecent({ items, archive, isLive: false, now: NOW }).id, 'short');
});

test('pickMostRecent: live but no stream scheduled near now (stuck isLive) releases to the existing rules', () => {
  const items = [{ id: 'short' }, { id: 'old' }];
  const archive = [
    { id: 'short', contentType: 'short' },
    { id: 'old', contentType: 'live', scheduledStartTime: '2026-09-20T12:00:00Z' },
  ];
  assert.equal(pickMostRecent({ items, archive, isLive: true, now: NOW }).id, 'short');
});

test('pickMostRecent: webhook usage (no RSS items) returns the archive entry for tonight\'s stream, or null', () => {
  const archive = [{ id: 'pre', contentType: 'upcoming', scheduledStartTime: '2026-09-28T12:00:00Z' }];
  assert.equal(pickMostRecent({ items: [], archive, isLive: true, now: NOW }).id, 'pre');
  assert.equal(pickMostRecent({ items: [], archive: [], isLive: true, now: NOW }), null);
});

test('buildFeedCache: same shape whether the item came from RSS or the archive', () => {
  const archive = [{ id: 'a', title: 'T', publishedAt: 'P', thumbnailUrl: 'U', description: 'D', contentType: 'live', scheduledStartTime: 'S' }];
  const fromRss = buildFeedCache({ id: 'a', title: 'T', publishedAt: 'P', thumbnailUrl: 'U' }, archive, 'now');
  const fromArchive = buildFeedCache(archive[0], archive, 'now');
  assert.deepEqual(fromRss, fromArchive);
  assert.deepEqual(fromRss, {
    mostRecent: { id: 'a', title: 'T', publishedAt: 'P', thumbnailUrl: 'U', description: 'D', contentType: 'live', scheduledStartTime: 'S' },
    updatedAt: 'now',
  });
  assert.deepEqual(buildFeedCache(null, archive, 'now'), { mostRecent: null, updatedAt: 'now' });
});
