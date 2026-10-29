// Pure decisions for the one-time push-permission prompt shown shortly after Home first appears (no React, no native modules, so node --test can run them).
// `permission` is expo-notifications' status ('undetermined' | 'granted' | 'denied'); `asked` is the AsyncStorage marker `push_prompt_asked`.

export const PROMPT_DELAY_MS = 1500;

/** Show the system permission prompt: only while the OS has never been asked AND we have not asked before. Never again after a denial (Settings > Notifications is the way back). */
export function shouldPromptForPush({ permission, asked }) {
  return permission === 'undetermined' && asked !== true;
}

/**
 * Register the device silently, once per install: permission is already granted (an earlier install step, or Android before 13 where it is granted by default) but this
 * install never registered a token because onboarding no longer does it. Idempotent on the server.
 */
export function shouldRegisterWithoutPrompt({ permission, asked }) {
  return permission === 'granted' && asked !== true;
}
