import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyVideo, isTooEarlyForMostRecent, UPCOMING_WINDOW_MS } from './youtube.js';

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

test('isTooEarlyForMostRecent: upcoming, 4h out (past the 3h window) is too early', () => {
  const archived = { contentType: 'upcoming', scheduledStartTime: '2026-09-28T16:00:00Z' };
  assert.equal(isTooEarlyForMostRecent(archived, NOW), true);
});

test('isTooEarlyForMostRecent: upcoming, exactly at the window boundary is not too early', () => {
  const archived = { contentType: 'upcoming', scheduledStartTime: new Date(NOW + UPCOMING_WINDOW_MS).toISOString() };
  assert.equal(isTooEarlyForMostRecent(archived, NOW), false);
});

test('isTooEarlyForMostRecent: upcoming, 1h out (inside the window) is not too early', () => {
  const archived = { contentType: 'upcoming', scheduledStartTime: '2026-09-28T13:00:00Z' };
  assert.equal(isTooEarlyForMostRecent(archived, NOW), false);
});

test('isTooEarlyForMostRecent: upcoming, scheduledStartTime already in the past is not too early', () => {
  const archived = { contentType: 'upcoming', scheduledStartTime: '2026-09-28T10:00:00Z' };
  assert.equal(isTooEarlyForMostRecent(archived, NOW), false);
});

test('isTooEarlyForMostRecent: upcoming with no scheduledStartTime is never too early', () => {
  const archived = { contentType: 'upcoming', scheduledStartTime: null };
  assert.equal(isTooEarlyForMostRecent(archived, NOW), false);
});

test('isTooEarlyForMostRecent: non-upcoming (live/video/short) is never too early', () => {
  assert.equal(isTooEarlyForMostRecent({ contentType: 'live', scheduledStartTime: '2026-09-29T00:00:00Z' }, NOW), false);
  assert.equal(isTooEarlyForMostRecent({ contentType: 'video' }, NOW), false);
});

test('isTooEarlyForMostRecent: missing/undefined archived entry is never too early', () => {
  assert.equal(isTooEarlyForMostRecent(undefined, NOW), false);
});
