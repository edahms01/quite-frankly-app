// Both flag states for the remote feature flags (pure logic; the screens call these helpers). Run with: node --test src/lib
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  FLAG_DEFAULTS, normalizeFlags, parseCachedFlags, applyOverride, isEnabled,
  onboardingNextRoute, onboardingDotCount, visibleTabs, homeDestinations, notificationRows, accountEntry, accountScreen, shouldRunAskFrankieHandoff,
} from './featureFlags.js';
import { FLAG_DEFAULTS as SERVER_DEFAULTS } from '../../netlify/functions/lib/flags.js';

const OFF = normalizeFlags({});
const ON = normalizeFlags({ accounts: true, cultureClub: true });
const ACCOUNTS_ON = normalizeFlags({ accounts: true });
const CLUB_ON = normalizeFlags({ cultureClub: true });

test('defaults: accounts and cultureClub are OFF; client and server list the same flags', () => {
  assert.equal(FLAG_DEFAULTS.accounts, false);
  assert.equal(FLAG_DEFAULTS.cultureClub, false);
  assert.deepEqual(FLAG_DEFAULTS, SERVER_DEFAULTS);
  assert.deepEqual(normalizeFlags(null), FLAG_DEFAULTS);
  assert.deepEqual(normalizeFlags(undefined), FLAG_DEFAULTS);
});

test('only a literal true turns a flag on; unknown keys are dropped', () => {
  assert.equal(normalizeFlags({ accounts: 'true' }).accounts, false);
  assert.equal(normalizeFlags({ accounts: 1 }).accounts, false);
  assert.equal(normalizeFlags({ cultureClub: 'yes' }).cultureClub, false);
  assert.equal(normalizeFlags({ accounts: true, extra: true }).extra, undefined);
  assert.equal(normalizeFlags({ accounts: true }).accounts, true);
});

test('cache and offline: unreadable or missing cached value is all OFF; a good one is used', () => {
  assert.deepEqual(parseCachedFlags(null), FLAG_DEFAULTS);
  assert.deepEqual(parseCachedFlags('not json'), FLAG_DEFAULTS);
  assert.deepEqual(parseCachedFlags('{"accounts":true,"cultureClub":false}'), { ...FLAG_DEFAULTS, accounts: true });
});

test('dev override: forces only the named flags; bad JSON changes nothing', () => {
  assert.equal(applyOverride(OFF, '{"accounts":true}').accounts, true);
  assert.equal(applyOverride(OFF, '{"accounts":true}').cultureClub, false);
  assert.equal(applyOverride(ON, '{"cultureClub":false}').cultureClub, false);
  assert.equal(applyOverride(ON, '{"cultureClub":false}').accounts, true);
  assert.deepEqual(applyOverride(OFF, '{oops'), OFF);
  assert.deepEqual(applyOverride(OFF, undefined), OFF);
});

test('isEnabled: one helper; unknown names and missing flags are OFF', () => {
  assert.equal(isEnabled(OFF, 'accounts'), false);
  assert.equal(isEnabled(ON, 'accounts'), true);
  assert.equal(isEnabled(ON, 'nope'), false);
  assert.equal(isEnabled(undefined, 'accounts'), false);
});

test('accounts OFF: onboarding goes Welcome -> notifications -> the app; ON keeps Email and Code entry', () => {
  assert.equal(onboardingNextRoute(OFF), 'MainTabs');
  assert.equal(onboardingDotCount(OFF), 2);
  assert.equal(onboardingNextRoute(ACCOUNTS_ON), 'Email');
  assert.equal(onboardingDotCount(ACCOUNTS_ON), 4);
});

test('accounts OFF: gear and "Settings" without email, Sign Out and Delete Account; ON: avatar and "Account" with all of them', () => {
  assert.deepEqual(accountEntry(OFF), { icon: 'gear', title: 'Settings' });
  assert.deepEqual(accountScreen(OFF), { title: 'Settings', showEmailRow: false, showSignOut: false, showDeleteAccount: false });
  assert.deepEqual(accountEntry(ACCOUNTS_ON), { icon: 'avatar', title: 'Account' });
  assert.deepEqual(accountScreen(ACCOUNTS_ON), { title: 'Account', showEmailRow: true, showSignOut: true, showDeleteAccount: true });
});

test('accounts OFF: no AskFrankie login handoff; ON: handoff runs', () => {
  assert.equal(shouldRunAskFrankieHandoff(OFF), false);
  assert.equal(shouldRunAskFrankieHandoff(CLUB_ON), false);
  assert.equal(shouldRunAskFrankieHandoff(ACCOUNTS_ON), true);
});

test('cultureClub OFF: 3 tabs, no Culture Club or Calendar tiles, no Event Reminders row; ON: all back', () => {
  assert.deepEqual(visibleTabs(OFF), ['Home', 'Watch', 'Listen']);
  assert.deepEqual(visibleTabs(CLUB_ON), ['Home', 'Watch', 'Listen', 'CultureClub']);
  const tiles = [{ label: 'Watch' }, { label: 'Culture Club', flag: 'cultureClub' }, { label: 'Calendar', flag: 'cultureClub' }, { label: 'Shop' }];
  assert.deepEqual(homeDestinations(tiles, OFF).map((t) => t.label), ['Watch', 'Shop']);
  assert.deepEqual(homeDestinations(tiles, ACCOUNTS_ON).map((t) => t.label), ['Watch', 'Shop']);   // accounts does not bring Culture Club back
  assert.deepEqual(homeDestinations(tiles, CLUB_ON).map((t) => t.label), ['Watch', 'Culture Club', 'Calendar', 'Shop']);
  const rows = [{ key: 'live' }, { key: 'video' }, { key: 'club' }];
  assert.deepEqual(notificationRows(rows, OFF).map((r) => r.key), ['live', 'video']);
  assert.deepEqual(notificationRows(rows, CLUB_ON).map((r) => r.key), ['live', 'video', 'club']);
});

test('no code removed: every hidden screen still exists and stays registered', () => {
  const root = new URL('../../', import.meta.url);
  for (const f of ['src/screens/onboarding/Email.js', 'src/screens/onboarding/CodeEntry.js', 'src/screens/account/DeleteAccount.js', 'src/screens/account/Account.js',
    'src/screens/members/CultureClub.js', 'src/screens/home/Calendar.js', 'src/navigation/CultureClubStackNavigator.js', 'src/lib/account.js']) {
    assert.ok(existsSync(new URL(f, root)), `${f} must still exist`);
  }
  const reg = (f) => readFileSync(new URL(f, root), 'utf8');
  assert.match(reg('src/navigation/OnboardingNavigator.js'), /name="Email"[\s\S]*name="CodeEntry"/);
  assert.match(reg('src/navigation/AccountStackNavigator.js'), /name="Account"[\s\S]*name="DeleteAccount"/);
  assert.match(reg('src/navigation/HomeStackNavigator.js'), /name="Calendar"/);
  assert.match(reg('src/navigation/MainTabNavigator.js'), /name="CultureClub"/);
});
