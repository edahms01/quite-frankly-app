import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildArchiveExtras, mergeArchiveBackfill, ARCHIVE_EXTRA_KEYS, classifyVideo, buildFeedCache, pickMostRecent, pickMostRecentItem, pickTonightsStream, UPCOMING_WINDOW_MS } from './youtube.js';

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

// ---- buildArchiveExtras ----

test('buildArchiveExtras: completed livestream carries actual start/end, scheduled start and stats', () => {
  const extras = buildArchiveExtras({
    snippet: { tags: ['a', 'b'], categoryId: '24', liveBroadcastContent: 'none', defaultAudioLanguage: 'en' },
    liveStreamingDetails: {
      scheduledStartTime: '2026-09-30T23:00:00Z',
      actualStartTime: '2026-09-30T23:05:00Z',
      actualEndTime: '2026-10-01T01:10:00Z',
    },
    statistics: { viewCount: '1234', likeCount: '56', commentCount: '7' },
    status: { privacyStatus: 'public' },
  });
  assert.deepEqual(extras, {
    startedAt: '2026-09-30T23:05:00Z',
    endedAt: '2026-10-01T01:10:00Z',
    scheduledStartTime: '2026-09-30T23:00:00Z',
    viewCount: 1234,
    likeCount: 56,
    commentCount: 7,
    tags: ['a', 'b'],
    categoryId: '24',
    privacyStatus: 'public',
    liveBroadcastContent: 'none',
    defaultAudioLanguage: 'en',
  });
});

test('buildArchiveExtras: hidden/absent likeCount and commentCount are null; numbers parsed from strings', () => {
  const extras = buildArchiveExtras({ statistics: { viewCount: '10' }, snippet: {} });
  assert.equal(extras.viewCount, 10);
  assert.equal(extras.likeCount, null);
  assert.equal(extras.commentCount, null);
  assert.equal(typeof extras.viewCount, 'number');
});

test('buildArchiveExtras: "0" counts stay 0, not null', () => {
  const extras = buildArchiveExtras({ statistics: { viewCount: '0', likeCount: '0', commentCount: '0' } });
  assert.deepEqual([extras.viewCount, extras.likeCount, extras.commentCount], [0, 0, 0]);
});

test('buildArchiveExtras: no tags -> []', () => {
  assert.deepEqual(buildArchiveExtras({ snippet: {} }).tags, []);
  assert.deepEqual(buildArchiveExtras({ snippet: { tags: undefined } }).tags, []);
});

test('buildArchiveExtras: plain upload with no liveStreamingDetails -> null times', () => {
  const extras = buildArchiveExtras({ snippet: { categoryId: '22' }, statistics: { viewCount: '5' } });
  assert.equal(extras.startedAt, null);
  assert.equal(extras.endedAt, null);
  assert.equal(extras.scheduledStartTime, null);
});

test('buildArchiveExtras: missing optional snippet/status fields -> null; every key always present', () => {
  const extras = buildArchiveExtras({});
  assert.equal(extras.categoryId, null);
  assert.equal(extras.privacyStatus, null);
  assert.equal(extras.liveBroadcastContent, null);
  assert.equal(extras.defaultAudioLanguage, null);
  assert.deepEqual(Object.keys(extras).sort(), [...ARCHIVE_EXTRA_KEYS].sort());
});

// ---- mergeArchiveBackfill ----

const ex = (over = {}) => ({
  startedAt: null, endedAt: null, scheduledStartTime: null, viewCount: 1, likeCount: 2, commentCount: 3,
  tags: [], categoryId: '24', privacyStatus: 'public', liveBroadcastContent: 'none', defaultAudioLanguage: null,
  ...over,
});

test('mergeArchiveBackfill: existing fields preserved verbatim, only new fields added', () => {
  const old = { id: 'a', title: 'Old title', contentType: 'live', publishedAt: '2026-09-01T00:00:00Z', lastSyncedAt: 'L0', description: 'd' };
  const api = { id: 'a', title: 'NEW title', contentType: 'video', publishedAt: '2026-01-01T00:00:00Z', lastSyncedAt: 'L1', ...ex({ startedAt: 'S' }) };
  const { merged, stats } = mergeArchiveBackfill([old], [api]);
  assert.equal(merged.length, 1);
  for (const k of Object.keys(old)) assert.equal(merged[0][k], old[k]);
  assert.equal(merged[0].startedAt, 'S');
  assert.equal(merged[0].viewCount, 1);
  assert.deepEqual(stats, { enriched: 1, appended: 0, blobOnly: 0 });
});

test('mergeArchiveBackfill: scheduledStartTime filled only when absent or null', () => {
  const kept = { id: 'k', publishedAt: '2026-03-01T00:00:00Z', scheduledStartTime: 'KEEP' };
  const nulled = { id: 'n', publishedAt: '2026-02-01T00:00:00Z', scheduledStartTime: null };
  const absent = { id: 'z', publishedAt: '2026-01-01T00:00:00Z' };
  const api = ['k', 'n', 'z'].map((id) => ({ id, publishedAt: 'x', ...ex({ scheduledStartTime: 'API' }) }));
  const { merged } = mergeArchiveBackfill([kept, nulled, absent], api);
  const by = Object.fromEntries(merged.map((v) => [v.id, v]));
  assert.equal(by.k.scheduledStartTime, 'KEEP');
  assert.equal(by.n.scheduledStartTime, 'API');
  assert.equal(by.z.scheduledStartTime, 'API');
});

test('mergeArchiveBackfill: an already-present extra key (even null) is not overwritten', () => {
  const old = { id: 'a', publishedAt: '2026-01-01T00:00:00Z', viewCount: null };
  const { merged } = mergeArchiveBackfill([old], [{ id: 'a', ...ex({ viewCount: 99 }) }]);
  assert.equal(merged[0].viewCount, null);
});

test('mergeArchiveBackfill: appends API items missing from blob, keeps blob-only items, newest-first, no dupes', () => {
  const blobOnly = { id: 'gone', publishedAt: '2026-02-01T00:00:00Z', title: 'gone' };
  const have = { id: 'have', publishedAt: '2026-03-01T00:00:00Z' };
  const fresh = { id: 'new', title: 'N', publishedAt: '2026-04-01T00:00:00Z', ...ex() };
  const { merged, stats } = mergeArchiveBackfill([have, blobOnly], [{ id: 'have', ...ex() }, fresh]);
  assert.deepEqual(merged.map((v) => v.id), ['new', 'have', 'gone']);
  assert.deepEqual(merged.find((v) => v.id === 'gone'), blobOnly);
  assert.equal(merged.find((v) => v.id === 'new').title, 'N');
  assert.deepEqual(stats, { enriched: 1, appended: 1, blobOnly: 1 });
});

test('mergeArchiveBackfill: does not mutate its inputs', () => {
  const old = { id: 'a', publishedAt: '2026-01-01T00:00:00Z' };
  const snap = JSON.stringify(old);
  mergeArchiveBackfill([old], [{ id: 'a', ...ex() }]);
  assert.equal(JSON.stringify(old), snap);
});
