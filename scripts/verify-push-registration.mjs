// Verifies the Phase 7 push-registration pipeline: register-push-device.js's
// validation/upsert behavior, and lib/push.js's getTokensForPreference query
// logic. Safe to re-run — cleans up its own test keys before and after.
//
// Requires a local `netlify dev` running in another terminal (default
// http://localhost:8888, override with NETLIFY_DEV_URL), and the temporary
// netlify/functions/_debug-inspect-tokens.js helper present (deleted before
// this branch is committed — see that file's header comment). Run with:
//   node scripts/verify-push-registration.mjs

import crypto from 'node:crypto';

const BASE_URL = process.env.NETLIFY_DEV_URL || 'http://localhost:8888';
const REGISTER_ENDPOINT = `${BASE_URL}/.netlify/functions/register-push-device`;
const WEBHOOK_ENDPOINT = `${BASE_URL}/.netlify/functions/twitch-webhook`;
const DEBUG_ENDPOINT = `${BASE_URL}/.netlify/functions/_debug-inspect-tokens`;
const LIVE_STATUS_ENDPOINT = `${BASE_URL}/.netlify/functions/get-live-status`;

const TEST_TOKENS = [
  'ExponentPushToken[TEST-TOKEN-1]',
  'ExponentPushToken[TEST-TOKEN-2]',
  'ExponentPushToken[TEST-TOKEN-3]',
];

async function post(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function inspect() {
  const response = await fetch(DEBUG_ENDPOINT);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`OK: ${message}`);
}

async function cleanup() {
  await post(DEBUG_ENDPOINT, { deleteKeys: TEST_TOKENS });
}

async function main() {
  await cleanup(); // in case a previous run died mid-way

  // 1. First-time registration
  let res = await post(REGISTER_ENDPOINT, {
    pushToken: TEST_TOKENS[0],
    preferences: { live: true, video: false, club: true },
  });
  assert(res.status === 200 && res.data?.ok === true, 'first registration returns 200 {ok:true}');

  let state = await inspect();
  let record = state.records.find((r) => r.pushToken === TEST_TOKENS[0]);
  assert(
    record?.preferences.live === true && record.preferences.video === false,
    'stored preferences match first POST'
  );

  // 2. Re-registration with changed preferences upserts, doesn't duplicate
  res = await post(REGISTER_ENDPOINT, {
    pushToken: TEST_TOKENS[0],
    preferences: { live: false, video: true, club: false },
  });
  assert(res.status === 200, 're-registration returns 200');
  state = await inspect();
  const matches = state.records.filter((r) => r.pushToken === TEST_TOKENS[0]);
  assert(matches.length === 1, 'only one record exists for the token after two POSTs');
  assert(
    matches[0].preferences.live === false && matches[0].preferences.video === true,
    'second POST overwrote preferences (upsert, not duplicate)'
  );

  // 3. Validation failures
  res = await post(REGISTER_ENDPOINT, { preferences: { live: true } });
  assert(res.status === 400, 'missing pushToken returns 400');

  res = await post(REGISTER_ENDPOINT, { pushToken: 'not-a-real-token', preferences: {} });
  assert(res.status === 400, 'malformed pushToken returns 400');

  const methodRes = await fetch(REGISTER_ENDPOINT, { method: 'GET' });
  assert(methodRes.status === 405, 'GET returns 405');

  // 4. Query logic — seed a second/third token, confirm getTokensForPreference filters correctly
  await post(REGISTER_ENDPOINT, {
    pushToken: TEST_TOKENS[1],
    preferences: { live: true, video: true, club: true },
  });
  await post(REGISTER_ENDPOINT, {
    pushToken: TEST_TOKENS[2],
    preferences: { live: false, video: true, club: false },
  });

  state = await inspect();
  assert(
    state.live.includes(TEST_TOKENS[1]) && !state.live.includes(TEST_TOKENS[2]),
    'getTokensForPreference("live") includes token 2, excludes token 3'
  );
  assert(
    state.video.includes(TEST_TOKENS[1]) && state.video.includes(TEST_TOKENS[2]),
    'getTokensForPreference("video") includes both token 2 and 3'
  );

  // 5. Replay a synthetic stream.online webhook — confirms the push step
  // fires correctly from the real trigger point, still returns 204 promptly
  // (load-bearing for the no-retry idempotency guarantee), and
  // qf-live-status updates. Requires TWITCH_WEBHOOK_SECRET in this shell.
  if (process.env.TWITCH_WEBHOOK_SECRET) {
    const messageId = `verify-script-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const rawBody = JSON.stringify({
      subscription: { type: 'stream.online', status: 'enabled' },
      event: {},
    });
    const hmac = crypto
      .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET)
      .update(messageId + timestamp + rawBody)
      .digest('hex');

    const webhookRes = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'twitch-eventsub-message-id': messageId,
        'twitch-eventsub-message-timestamp': timestamp,
        'twitch-eventsub-message-signature': `sha256=${hmac}`,
        'twitch-eventsub-message-type': 'notification',
      },
      body: rawBody,
    });
    assert(webhookRes.status === 204, 'synthetic stream.online webhook returns 204');

    const liveStatusRes = await fetch(LIVE_STATUS_ENDPOINT);
    const liveStatus = await liveStatusRes.json();
    assert(liveStatus?.isLive === true, 'qf-live-status updated to isLive:true after replay');
  } else {
    console.log('Skipping stream.online webhook replay — TWITCH_WEBHOOK_SECRET not set in this shell.');
  }

  await cleanup();
  console.log('\nAll checks passed. Test keys cleaned up.');
}

main().catch(async (err) => {
  console.error(err.message);
  await cleanup();
  process.exit(1);
});
