// Shared retry/backoff wrapper around fetch -- implemented once, imported by
// both the blog backfill script and the blog poller (Global Constraints).
// Behaves like a drop-in replacement for fetch: resolves to the Response on
// success OR on a non-retryable/exhausted failure (never throws for an HTTP
// error status, matching plain fetch semantics -- callers still do their own
// `if (!response.ok) throw ...`). Only rejects if the underlying transport
// itself throws (network error) on the final attempt.
//
// Params (Global Constraints): max 5 attempts, base 1000ms, x2 exponential,
// capped at 30s, +/-20% jitter; honors a `Retry-After` response header when
// present (seconds or HTTP-date, per spec) in place of the computed delay;
// retries on 429/5xx; fails fast (returns immediately) on any other 4xx.
//
// A thrown transport error (e.g. DNS failure, timeout) is treated as
// retryable too -- the constraints only specify the HTTP-status retry
// policy, but a transport error isn't a "4xx" either, and failing fast on a
// blip would defeat the point of a backoff helper.

const DEFAULTS = {
  maxAttempts: 5,
  baseMs: 1000,
  multiplier: 2,
  capMs: 30000,
  jitterRatio: 0.2,
};

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exported for direct unit testing -- pure, no I/O.
export function parseRetryAfterMs(headerValue) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

// Exported for direct unit testing -- pure, no I/O (randomness aside).
export function backoffDelayMs(attempt, config = {}) {
  const { baseMs, multiplier, capMs, jitterRatio } = { ...DEFAULTS, ...config };
  const raw = Math.min(baseMs * multiplier ** (attempt - 1), capMs);
  const jitter = raw * jitterRatio;
  const min = Math.max(0, raw - jitter);
  const max = raw + jitter;
  return min + Math.random() * (max - min);
}

// `config` accepts the tuning knobs above plus two test seams:
//   - fetchImpl: replaces global fetch (default: globalThis.fetch)
//   - sleepFn: replaces the real timer-based sleep (default: setTimeout-based)
export async function fetchWithBackoff(url, fetchOptions = {}, config = {}) {
  const opts = { ...DEFAULTS, ...config };
  const fetchImpl = opts.fetchImpl || fetch;
  const sleep = opts.sleepFn || defaultSleep;

  let lastError = null;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, fetchOptions);
    } catch (err) {
      lastError = err;
      if (attempt === opts.maxAttempts) throw err;
      await sleep(backoffDelayMs(attempt, opts));
      continue;
    }

    if (response.ok) return response;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === opts.maxAttempts) {
      return response;
    }

    const retryAfterMs = parseRetryAfterMs(response.headers?.get?.('Retry-After'));
    const delay = retryAfterMs !== null ? retryAfterMs : backoffDelayMs(attempt, opts);
    await sleep(delay);
  }

  // Unreachable (the loop above always returns or throws on its last
  // iteration) -- kept for control-flow clarity/static analysis.
  throw lastError || new Error('fetchWithBackoff: exhausted retries');
}

// Same backoff timing/jitter as fetchWithBackoff (reuses backoffDelayMs),
// for callers that aren't calling fetch directly -- e.g. blobs.js's
// getJSON/setJSON, which go through @netlify/blobs's SDK (a thrown Error,
// not a Response with a status to branch on). Unlike fetchWithBackoff there
// is no response status to distinguish "retryable" from "not" -- the SDK
// doesn't expose one -- so any thrown error is treated as retryable, same
// posture fetchWithBackoff itself takes for a raw transport-error throw.
export async function retryAsync(fn, config = {}) {
  const opts = { ...DEFAULTS, ...config };
  const sleep = opts.sleepFn || defaultSleep;

  let lastError = null;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === opts.maxAttempts) throw err;
      await sleep(backoffDelayMs(attempt, opts));
    }
  }

  throw lastError || new Error('retryAsync: exhausted retries');
}
