import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const PREFERENCES_STORAGE_KEY = 'push_notification_preferences';

export const DEFAULT_PREFERENCES = { live: true, video: true, club: true };

export async function getStoredPreferences() {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function setStoredPreferences(preferences) {
  try {
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // best-effort cache only; never block the caller on this
  }
}

export async function registerForPushNotifications(preferences) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return { registered: false, reason: 'permission-denied' };
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('Push registration skipped: no EAS projectId configured yet.');
    return { registered: false, reason: 'missing-project-id' };
  }

  let pushToken;
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    pushToken = tokenResponse.data;
  } catch (err) {
    console.warn('Failed to get Expo push token', err);
    return { registered: false, reason: 'token-error' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/register-push-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken, preferences }),
    });
    if (!response.ok) throw new Error(`register-push-device failed: ${response.status}`);
  } catch (err) {
    console.warn('Failed to register push device with backend', err);
    return { registered: false, reason: 'network-error' };
  }

  await setStoredPreferences(preferences);
  return { registered: true, pushToken };
}
