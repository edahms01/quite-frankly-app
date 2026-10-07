import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMAIL_KEY, SESSION_TOKEN_KEY } from '../config/askfrankie';
import { navigationRef } from '../navigation/navigationRef';
import { getOwnPushToken } from './pushNotifications';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const fn = (name) => `${API_BASE_URL}/.netlify/functions/${name}`;
const PUSH_PREFS_KEY = 'push_notification_preferences';

export const getSessionToken = () => AsyncStorage.getItem(SESSION_TOKEN_KEY);
export const getStoredEmail = () => AsyncStorage.getItem(EMAIL_KEY);

/** Forget everything account-related ON THIS DEVICE and go back to the start of onboarding. */
export async function clearLocalAccount() {
  await AsyncStorage.multiRemove([SESSION_TOKEN_KEY, EMAIL_KEY, PUSH_PREFS_KEY]);
  if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
}

/**
 * Sign out: revoke the session on the server (best effort) and clear this device. The device is cleared even when the network fails: a sign-out must never leave
 * the person signed in. `serverRevoked` says whether the server confirmed.
 */
export async function signOut() {
  const token = await getSessionToken();
  let serverRevoked = !token;
  if (token) {
    try {
      const res = await fetch(fn('sign-out'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      serverRevoked = res.ok;
    } catch { serverRevoked = false; }
  }
  await clearLocalAccount();
  return { serverRevoked };
}

/**
 * Delete the account: the server deletes everything it holds for the signed-in email (and the linked AskFrankie account), then this device is cleared.
 * Returns { ok: true } or { ok: false, reason: 'offline' | 'try_again' | 'rate_limited' }. A 401 means the session is already gone (for example deleted on the
 * web page): that counts as done. The device is cleared ONLY on success, so a failure can simply be retried.
 */
export async function deleteAccount() {
  const token = await getSessionToken();
  if (!token) { await clearLocalAccount(); return { ok: true }; }
  const pushToken = await getOwnPushToken();     // push registrations are not tied to an email: only this device knows its own token
  let res;
  try {
    res = await fetch(fn('delete-account'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(pushToken ? { pushToken } : {}) });
  } catch { return { ok: false, reason: 'offline' }; }
  if (res.ok || res.status === 401) { await clearLocalAccount(); return { ok: true }; }
  return { ok: false, reason: res.status === 429 ? 'rate_limited' : 'try_again' };
}

/** A fresh 60-second AskFrankie login token for the signed-in app user, or null for ANY reason (flag off, no session, old session, network). */
export async function fetchLinkToken() {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(fn('askfrankie-link'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.token === 'string' ? data.token : null;
  } catch { return null; }
}
