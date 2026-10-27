// Remote feature flags: pure logic (no React, no native modules) so both flag states can be tested with node --test.
// The flags come from netlify/functions/get-feature-flags.js (Blobs store qf-flags/flags). Everything is OFF unless the server says a flag is
// literally `true`. FLAG_DEFAULTS must list the same keys as netlify/functions/lib/flags.js.

export const FLAG_DEFAULTS = {
  askfrankie_enabled: false,
  askfrankie_linked_login: false,
  accounts: false,        // account creation, sign-in, Sign Out, Delete Account, the AskFrankie login handoff
  cultureClub: false,     // the Culture Club tab/page and the Calendar tile/page
};

/** Only a literal `true` counts; unknown keys are dropped. */
export function normalizeFlags(raw) {
  const out = { ...FLAG_DEFAULTS };
  if (raw && typeof raw === 'object') for (const k of Object.keys(FLAG_DEFAULTS)) out[k] = raw[k] === true;
  return out;
}

/** Parse a cached JSON string (or null) into flags; anything unreadable gives the defaults. */
export function parseCachedFlags(text) {
  if (typeof text !== 'string') return { ...FLAG_DEFAULTS };
  try { return normalizeFlags(JSON.parse(text)); } catch { return { ...FLAG_DEFAULTS }; }
}

/** Dev-only override (EXPO_PUBLIC_FLAGS_OVERRIDE='{"accounts":true}') so screenshots never need a live flag flipped. Bad JSON = no override. */
export function applyOverride(flags, overrideText) {
  if (typeof overrideText !== 'string' || !overrideText) return flags;
  try { return { ...flags, ...normalizeFlagsPartial(JSON.parse(overrideText)) }; } catch { return flags; }
}
function normalizeFlagsPartial(raw) {
  const out = {};
  if (raw && typeof raw === 'object') for (const k of Object.keys(FLAG_DEFAULTS)) if (k in raw) out[k] = raw[k] === true;
  return out;
}

/** The one question every screen asks. Unknown flag names are OFF. */
export function isEnabled(flags, name) {
  return !!flags && flags[name] === true;
}

// ---- decisions the screens use (kept here so each flag state is testable) ----

/** Onboarding: Welcome -> notifications -> (Email -> CodeEntry only when accounts is on) -> the app. */
export function onboardingNextRoute(flags) { return isEnabled(flags, 'accounts') ? 'Email' : 'MainTabs'; }
export function onboardingDotCount(flags) { return isEnabled(flags, 'accounts') ? 4 : 2; }

/** Bottom tabs, in order. */
export function visibleTabs(flags) {
  return ['Home', 'Watch', 'Listen', ...(isEnabled(flags, 'cultureClub') ? ['CultureClub'] : [])];
}

/** Home tiles: an entry with `flag` is shown only while that flag is on. */
export function homeDestinations(all, flags) {
  return all.filter((d) => !d.flag || isEnabled(flags, d.flag));
}

/** Notification toggles: the Culture Club reminder row only while cultureClub is on. */
export function notificationRows(rows, flags) {
  return rows.filter((r) => r.key !== 'club' || isEnabled(flags, 'cultureClub'));
}

/** The header button that opens the account area: the avatar with accounts on, a gear ("Settings") with accounts off. */
export function accountEntry(flags) {
  return isEnabled(flags, 'accounts')
    ? { icon: 'avatar', title: 'Account' }
    : { icon: 'gear', title: 'Settings' };
}

/** What the account screen shows: with accounts off it is "Settings" without the email row, Sign Out and Delete Account. */
export function accountScreen(flags) {
  const on = isEnabled(flags, 'accounts');
  return { title: on ? 'Account' : 'Settings', showEmailRow: on, showSignOut: on, showDeleteAccount: on };
}

/** AskFrankie in the app: the login handoff (link token, email prefill) runs only with accounts on. */
export function shouldRunAskFrankieHandoff(flags) { return isEnabled(flags, 'accounts'); }
