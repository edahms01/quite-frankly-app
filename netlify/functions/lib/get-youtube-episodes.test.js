import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, stripArchiveOnlyKeys } from '../get-youtube-episodes.js';

const OLD = {
  id: 'a', title: 'T', url: 'u', contentType: 'live', publishedAt: '2026-01-01T00:00:00Z',
  durationSeconds: 60, durationTimestamp: '0:01:00', description: 'd', thumbnailUrl: 't', lastSyncedAt: 'L',
};
const NEW_FIELDS = {
  startedAt: 's', endedAt: 'e', viewCount: 1, likeCount: 2, commentCount: 3, tags: ['x'],
  categoryId: '24', privacyStatus: 'public', liveBroadcastContent: 'none', defaultAudioLanguage: 'en',
};

async function call(archive, query = '') {
  const handler = createHandler({ getJSONFn: async () => archive });
  const res = await handler(new Request(`https://x.test/get-youtube-episodes${query}`));
  return res.json();
}

test('strips the 10 archive-only keys, keeps every original field and scheduledStartTime', async () => {
  const body = await call([{ ...OLD, scheduledStartTime: 'sched', ...NEW_FIELDS }]);
  assert.deepEqual(body.episodes, [{ ...OLD, scheduledStartTime: 'sched' }]);
});

test('does not add a scheduledStartTime key that is absent; keeps a null one', async () => {
  const body = await call([{ ...OLD, ...NEW_FIELDS }, { ...OLD, id: 'b', scheduledStartTime: null }]);
  assert.equal('scheduledStartTime' in body.episodes[0], false);
  assert.equal(body.episodes[1].scheduledStartTime, null);
});

test('pagination (offset/limit/total/hasMore) is unchanged', async () => {
  const archive = Array.from({ length: 5 }, (_, i) => ({ ...OLD, id: `v${i}`, ...NEW_FIELDS }));
  const body = await call(archive, '?offset=1&limit=2');
  assert.deepEqual(body.episodes.map((e) => e.id), ['v1', 'v2']);
  assert.equal(body.total, 5);
  assert.equal(body.hasMore, true);
});

test('stripArchiveOnlyKeys does not mutate its input', () => {
  const ep = { ...OLD, ...NEW_FIELDS };
  stripArchiveOnlyKeys(ep);
  assert.equal(ep.viewCount, 1);
});
