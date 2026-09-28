import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithBackoff, parseRetryAfterMs, backoffDelayMs } from './fetchWithBackoff.js';

function makeResponse(status, { retryAfter } = {}) {
  const headers = new Map();
  if (retryAfter !== undefined) headers.set('Retry-After', String(retryAfter));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (headers.has(name) ? headers.get(name) : null) },
  };
}

// Records sleep calls instead of actually waiting, so tests run instantly
// while still exercising the real retry/backoff decision logic.
function fakeSleep(calls) {
  return async (ms) => {
    calls.push(ms);
  };
}

test('returns the response immediately on success (first attempt)', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return makeResponse(200);
  };
  const sleeps = [];
  const response = await fetchWithBackoff('https://example.com', {}, { fetchImpl, sleepFn: fakeSleep(sleeps) });
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('retries on 429 then succeeds on 200', async () => {
  const statuses = [429, 200];
  let call = 0;
  const fetchImpl = async () => makeResponse(statuses[call++]);
  const sleeps = [];
  const response = await fetchWithBackoff('https://example.com', {}, { fetchImpl, sleepFn: fakeSleep(sleeps) });
  assert.equal(response.status, 200);
  assert.equal(call, 2);
  assert.equal(sleeps.length, 1);
});

test('retries on 5xx and respects Retry-After header (seconds) over computed backoff', async () => {
  const statuses = [503, 200];
  let call = 0;
  const fetchImpl = async () => makeResponse(statuses[call++], call === 1 ? { retryAfter: 3 } : undefined);
  const sleeps = [];
  const response = await fetchWithBackoff('https://example.com', {}, { fetchImpl, sleepFn: fakeSleep(sleeps) });
  assert.equal(response.status, 200);
  assert.equal(sleeps.length, 1);
  assert.equal(sleeps[0], 3000);
});

test('fails fast (no retry) on a non-retryable 4xx', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return makeResponse(404);
  };
  const sleeps = [];
  const response = await fetchWithBackoff('https://example.com', {}, { fetchImpl, sleepFn: fakeSleep(sleeps) });
  assert.equal(response.status, 404);
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('stops retrying after maxAttempts and returns the last response', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return makeResponse(500);
  };
  const sleeps = [];
  const response = await fetchWithBackoff(
    'https://example.com',
    {},
    { fetchImpl, sleepFn: fakeSleep(sleeps), maxAttempts: 5 }
  );
  assert.equal(response.status, 500);
  assert.equal(calls, 5);
  assert.equal(sleeps.length, 4); // one sleep between each of the 5 attempts
});

test('retries a thrown transport error, then succeeds', async () => {
  let call = 0;
  const fetchImpl = async () => {
    call++;
    if (call === 1) throw new Error('network blip');
    return makeResponse(200);
  };
  const sleeps = [];
  const response = await fetchWithBackoff('https://example.com', {}, { fetchImpl, sleepFn: fakeSleep(sleeps) });
  assert.equal(response.status, 200);
  assert.equal(call, 2);
  assert.equal(sleeps.length, 1);
});

test('rejects with the last error if every attempt throws', async () => {
  const fetchImpl = async () => {
    throw new Error('down');
  };
  const sleeps = [];
  await assert.rejects(
    () => fetchWithBackoff('https://example.com', {}, { fetchImpl, sleepFn: fakeSleep(sleeps), maxAttempts: 3 }),
    /down/
  );
  assert.equal(sleeps.length, 2);
});

test('default exponential backoff doubles each attempt up to the cap, within jitter', () => {
  // base 1000ms, x2, cap 30000ms, +/-20% jitter (defaults)
  for (const [attempt, expectedRaw] of [[1, 1000], [2, 2000], [3, 4000], [4, 8000], [5, 16000], [6, 30000], [10, 30000]]) {
    const delay = backoffDelayMs(attempt);
    assert.ok(delay >= expectedRaw * 0.8 - 1e-6, `attempt ${attempt}: ${delay} below jitter floor`);
    assert.ok(delay <= expectedRaw * 1.2 + 1e-6, `attempt ${attempt}: ${delay} above jitter ceiling`);
  }
});

test('parseRetryAfterMs handles seconds, HTTP-date, and invalid input', () => {
  assert.equal(parseRetryAfterMs('5'), 5000);
  assert.equal(parseRetryAfterMs(null), null);
  assert.equal(parseRetryAfterMs(''), null);
  assert.equal(parseRetryAfterMs('not-a-date'), null);

  const future = new Date(Date.now() + 10000).toUTCString();
  const ms = parseRetryAfterMs(future);
  assert.ok(ms > 8000 && ms <= 10000, `expected ~10000ms, got ${ms}`);
});
