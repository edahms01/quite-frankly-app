import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { hasAskedForPush, markAskedForPush } from '../lib/firstRun';
import { PROMPT_DELAY_MS, shouldPromptForPush, shouldRegisterWithoutPrompt } from '../lib/pushPromptDecision';
import { DEFAULT_PREFERENCES, registerForPushNotifications } from '../lib/pushNotifications';

/**
 * (Android 13+ reports `denied` with canAskAgain=true before the first request, so `canAskAgain` is part of the decision.)
 * The only place the app asks for notification permission now that onboarding is skipped by default. Runs from Home: about 1.5 s after Home first shows, if the OS has
 * never been asked and we have not asked before, show the system prompt once (the marker is written BEFORE asking, so a kill mid-prompt never re-asks) and register the
 * device on a yes, exactly as the old onboarding screen did. If Home is not the focused screen at that moment (a modal or another stack is up) nothing happens and the
 * next launch tries again. Never asks again after a denial; Settings > Notifications stays as the way back.
 */
export function useFirstHomePushPrompt(navigation) {
  useEffect(() => {
    let cancelled = false;
    let timer;
    (async () => {
      try {
        const [{ status, canAskAgain }, asked] = await Promise.all([Notifications.getPermissionsAsync(), hasAskedForPush()]);
        const state = { permission: status, canAskAgain, asked };
        if (cancelled) return;
        if (shouldRegisterWithoutPrompt(state)) {
          await markAskedForPush();
          await registerForPushNotifications(DEFAULT_PREFERENCES);
          return;
        }
        if (!shouldPromptForPush(state)) return;
        timer = setTimeout(async () => {
          if (cancelled || !navigation.isFocused()) return;
          await markAskedForPush();
          const res = await Notifications.requestPermissionsAsync();
          if (res.status === 'granted') await registerForPushNotifications(DEFAULT_PREFERENCES);
        }, PROMPT_DELAY_MS);
      } catch {
        /* best effort: never block or crash Home */
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [navigation]);
}
