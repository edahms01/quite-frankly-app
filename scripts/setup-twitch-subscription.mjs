// One-time (and recovery) setup: creates the stream.online/stream.offline
// EventSub subscriptions that drive live-status. Safe to re-run — skips
// any subscription that's already enabled or pending for this callback.
//
// Run with all Netlify env vars injected:
//   netlify dev:exec -- node scripts/setup-twitch-subscription.mjs

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const CHANNEL_LOGIN = process.env.TWITCH_CHANNEL_LOGIN;
const WEBHOOK_SECRET = process.env.TWITCH_WEBHOOK_SECRET;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const REQUIRED = { CLIENT_ID, CLIENT_SECRET, CHANNEL_LOGIN, WEBHOOK_SECRET, API_BASE_URL };
for (const [name, value] of Object.entries(REQUIRED)) {
  if (!value) {
    console.error(`Missing required env var for: ${name}`);
    process.exit(1);
  }
}

const CALLBACK_URL = `${API_BASE_URL}/.netlify/functions/twitch-webhook`;

async function getAppAccessToken() {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function getBroadcasterId(token) {
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${CHANNEL_LOGIN}`, {
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`User lookup failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  if (!data.data?.[0]) {
    throw new Error(`No Twitch user found for login "${CHANNEL_LOGIN}"`);
  }
  return data.data[0].id;
}

async function listExistingSubscriptions(token) {
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Subscription list failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.data ?? [];
}

async function createSubscription(token, type, broadcasterId) {
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Client-Id': CLIENT_ID,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      version: '1',
      condition: { broadcaster_user_id: broadcasterId },
      transport: { method: 'webhook', callback: CALLBACK_URL, secret: WEBHOOK_SECRET },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Subscription create failed for ${type}: ${response.status} ${JSON.stringify(data)}`);
  }
  return data.data[0];
}

async function main() {
  console.log(`Callback URL: ${CALLBACK_URL}`);

  const token = await getAppAccessToken();
  const broadcasterId = await getBroadcasterId(token);
  console.log(`Broadcaster ID for ${CHANNEL_LOGIN}: ${broadcasterId}`);

  const existing = await listExistingSubscriptions(token);
  const isLiveOrPending = (type) =>
    existing.some(
      (sub) =>
        sub.type === type &&
        sub.condition?.broadcaster_user_id === broadcasterId &&
        sub.transport?.callback === CALLBACK_URL &&
        ['enabled', 'webhook_callback_verification_pending'].includes(sub.status)
    );

  for (const type of ['stream.online', 'stream.offline']) {
    if (isLiveOrPending(type)) {
      console.log(`Skipping ${type} — already enabled/pending for this callback.`);
      continue;
    }
    const sub = await createSubscription(token, type, broadcasterId);
    console.log(`Created ${type}: status=${sub.status}, id=${sub.id}`);
  }

  console.log('Done. Check status with:');
  console.log(
    `curl -H "Client-Id: ${CLIENT_ID}" -H "Authorization: Bearer ${token}" https://api.twitch.tv/helix/eventsub/subscriptions`
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
