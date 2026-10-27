import { blobStore } from './blobs.js';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

// A device is opted in unless it explicitly stored `false` for this key.
// Devices registered before a preference key existed (e.g. `substack`) have
// no such key and would otherwise never be notified, because the app only
// re-registers during onboarding or when Notifications settings is opened.
// register-push-device.js always writes live/video/club explicitly, so the
// older alerts are unaffected. Records without a preferences object or token
// are still excluded.
export function tokensForPreference(records, preferenceKey) {
  return records
    .filter((record) => record?.pushToken && record.preferences && typeof record.preferences === 'object' && record.preferences[preferenceKey] !== false)
    .map((record) => record.pushToken);
}

export async function getTokensForPreference(preferenceKey, { storeFactory = blobStore } = {}) {
  const store = storeFactory('qf-push-tokens');
  const { blobs } = await store.list();
  if (blobs.length === 0) return [];

  const records = await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));

  return tokensForPreference(records, preferenceKey);
}

export async function sendExpoPushBatch(tokens, { title, body, data } = {}) {
  if (!tokens || tokens.length === 0) return { sent: 0 };

  const messages = tokens.map((to) => ({
    to, title, body, sound: 'default', ...(data ? { data } : {}),
  }));

  let sent = 0;
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        console.error(`Expo push send failed: ${response.status} ${await response.text()}`);
        continue;
      }
      sent += chunk.length;
    } catch (err) {
      console.error('Expo push send request failed', err);
    }
  }
  return { sent };
}
