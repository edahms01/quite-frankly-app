import AsyncStorage from '@react-native-async-storage/async-storage';

// Two one-time markers. Both fail soft: a storage error is treated as "already done" so a broken disk can never trap anyone in onboarding or re-prompt them forever.
const ONBOARDING_DONE_KEY = 'onboarding_done';
const PUSH_PROMPT_ASKED_KEY = 'push_prompt_asked';

export async function getOnboardingDone() {
  try { return (await AsyncStorage.getItem(ONBOARDING_DONE_KEY)) === '1'; } catch { return true; }
}
let doneWritten = false;
export function markOnboardingDone() {
  if (doneWritten) return;
  doneWritten = true;
  AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1').catch(() => {});
}

export async function hasAskedForPush() {
  try { return (await AsyncStorage.getItem(PUSH_PROMPT_ASKED_KEY)) === '1'; } catch { return true; }
}
export async function markAskedForPush() {
  try { await AsyncStorage.setItem(PUSH_PROMPT_ASKED_KEY, '1'); } catch { /* best effort */ }
}
