// Unit tests for getJSON/setJSON's retry wiring (2026-09-28 fix -- these had
// no retry at all before, unlike the Sheets read functions, which is a real
// gap: a single transient Netlify Blobs read/write failure surfaced
// directly with no retry, the same bug family as the earlier "couldn't load
// more posts" Sheets-retry gap). No real Netlify Blobs credentials needed:
// `storeFactory` is an injectable test seam (default: the real `getStore`)
// that swaps in a fake Store object whose get/setJSON methods can be made
// to fail N times before succeeding, and `sleepFn` (forwarded straight
// through to retryAsync) replaces the real timer-based sleep so tests run
// instantly while still exercising the real retry-count/give-up logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getJSON, setJSON } from './blobs.js';

function fakeSleep(calls) {
  return async (ms) => { calls.push(ms); };
}

// Builds a fake Store whose .get()/.setJSON() reject `failTimes` times
// (recording each call) before resolving with `resolveValue`.
function makeFlakyStore({ failTimes = 0, resolveValue = null } = {}) {
  let getCalls = 0;
  let setCalls = 0;
  return {
    calls: { get: () => getCalls, set: () => setCalls },
    async get(key, opts) {
      getCalls++;
      if (getCalls <= failTimes) throw new Error(`transient get failure #${getCalls}`);
      return resolveValue;
    },
    async setJSON(key, value) {
      setCalls++;
      if (setCalls <= failTimes) throw new Error(`transient set failure #${setCalls}`);
    },
  };
}

test('getJSON: returns the value immediately on success (first attempt)', async () => {
  const store = makeFlakyStore({ failTimes: 0, resolveValue: { bodyHtml: '<p>hi</p>' } });
  const storeFactory = () => store;
  const result = await getJSON('blog-bodies', 'id1', null, { storeFactory, sleepFn: fakeSleep([]) });
  assert.deepEqual(result, { bodyHtml: '<p>hi</p>' });
  assert.equal(store.calls.get(), 1);
});

test('getJSON: retries a transient failure and recovers', async () => {
  const store = makeFlakyStore({ failTimes: 2, resolveValue: { bodyHtml: '<p>recovered</p>' } });
  const storeFactory = () => store;
  const sleeps = [];
  const result = await getJSON('blog-bodies', 'id1', null, { storeFactory, sleepFn: fakeSleep(sleeps) });
  assert.deepEqual(result, { bodyHtml: '<p>recovered</p>' });
  assert.equal(store.calls.get(), 3, 'failed twice, succeeded on the 3rd attempt');
  assert.equal(sleeps.length, 2, 'slept before the 2nd and 3rd attempts');
});

test('getJSON: exhausts retries and propagates the error rather than silently returning the fallback', async () => {
  const store = makeFlakyStore({ failTimes: 10 }); // always fails
  const storeFactory = () => store;
  await assert.rejects(
    () => getJSON('blog-bodies', 'id1', 'fallback', { storeFactory, sleepFn: fakeSleep([]), maxAttempts: 3 }),
    /transient get failure #3/
  );
  assert.equal(store.calls.get(), 3);
});

test('getJSON: a missing key (real null, not a failure) returns fallback without retrying', async () => {
  const store = makeFlakyStore({ failTimes: 0, resolveValue: null });
  const storeFactory = () => store;
  const result = await getJSON('blog-bodies', 'missing-id', 'the-fallback', { storeFactory, sleepFn: fakeSleep([]) });
  assert.equal(result, 'the-fallback');
  assert.equal(store.calls.get(), 1, 'a real null (key not found) is not an error -- must not retry');
});

test('setJSON: retries a transient failure and recovers', async () => {
  const store = makeFlakyStore({ failTimes: 2 });
  const storeFactory = () => store;
  const sleeps = [];
  await setJSON('blog-bodies', 'id1', { bodyHtml: '<p>x</p>' }, { storeFactory, sleepFn: fakeSleep(sleeps) });
  assert.equal(store.calls.set(), 3);
  assert.equal(sleeps.length, 2);
});

test('setJSON: exhausts retries and propagates the error', async () => {
  const store = makeFlakyStore({ failTimes: 10 });
  const storeFactory = () => store;
  await assert.rejects(
    () => setJSON('blog-bodies', 'id1', { bodyHtml: '<p>x</p>' }, { storeFactory, sleepFn: fakeSleep([]), maxAttempts: 2 }),
    /transient set failure #2/
  );
  assert.equal(store.calls.set(), 2);
});
