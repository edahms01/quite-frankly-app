// Both flag states for the remote feature flags (pure logic; the screens call these helpers). Run with: node --test src/lib
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  FLAG_DEFAULTS, normalizeFlags, parseCachedFlags, applyOverride, isEnabled,
  onboardingNextRoute, onboardingDotCount, initialRoute, homeDestinations, homeWebsiteLink, WEBSITE_LINK, accountEntry, accountScreen, shouldRunAskFrankieHandoff,
} from './featureFlags.js';
import { FLAG_DEFAULTS as SERVER_DEFAULTS } from '../../netlify/functions/lib/flags.js';

const OFF = normalizeFlags({});
const ON = normalizeFlags({ accounts: true });
const ACCOUNTS_ON = normalizeFlags({ accounts: true });

test('defaults: accounts and onboarding are OFF; websiteLink is ON; the removed Culture Club / Monthly Support flags are gone; client and server list the same flags', () => {
  assert.equal(FLAG_DEFAULTS.onboarding, false);
  assert.equal(FLAG_DEFAULTS.accounts, false);
  assert.equal(FLAG_DEFAULTS.websiteLink, true);
  assert.equal('cultureClub' in FLAG_DEFAULTS, false);
  assert.equal('androidMonthlySupport' in FLAG_DEFAULTS, false);
  assert.deepEqual(FLAG_DEFAULTS, SERVER_DEFAULTS);
  assert.deepEqual(normalizeFlags(null), FLAG_DEFAULTS);
  assert.deepEqual(normalizeFlags(undefined), FLAG_DEFAULTS);
});

test('only a literal true turns a flag on; unknown keys are dropped', () => {
  assert.equal(normalizeFlags({ accounts: 'true' }).accounts, false);
  assert.equal(normalizeFlags({ accounts: 1 }).accounts, false);
  assert.equal(normalizeFlags({ cultureClub: true }).cultureClub, undefined);   // removed flags are dropped
  assert.equal(normalizeFlags({ accounts: true, extra: true }).extra, undefined);
  assert.equal(normalizeFlags({ accounts: true }).accounts, true);
});

test('cache and offline: unreadable or missing cached value is all OFF; a good one is used', () => {
  assert.deepEqual(parseCachedFlags(null), FLAG_DEFAULTS);
  assert.deepEqual(parseCachedFlags('not json'), FLAG_DEFAULTS);
  assert.deepEqual(parseCachedFlags('{"accounts":true,"websiteLink":true}'), { ...FLAG_DEFAULTS, accounts: true });
});

test('dev override: forces only the named flags; bad JSON changes nothing', () => {
  assert.equal(applyOverride(OFF, '{"accounts":true}').accounts, true);
  assert.equal(applyOverride(OFF, '{"accounts":true}').websiteLink, true);
  assert.equal(applyOverride(ON, '{"websiteLink":false}').websiteLink, false);
  assert.equal(applyOverride(ON, '{"websiteLink":false}').accounts, true);
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
  assert.deepEqual(accountScreen(OFF), { title: 'Settings', showEmailRow: false, showSignOut: false, showDeleteAccount: false, showPrivacyRow: true, showOwnershipNotice: true });
  assert.deepEqual(accountEntry(ACCOUNTS_ON), { icon: 'avatar', title: 'Account' });
  assert.deepEqual(accountScreen(ACCOUNTS_ON), { title: 'Account', showEmailRow: true, showSignOut: true, showDeleteAccount: true, showPrivacyRow: true, showOwnershipNotice: true });
});

test('accounts OFF: no AskFrankie login handoff; ON: handoff runs', () => {
  assert.equal(shouldRunAskFrankieHandoff(OFF), false);
  assert.equal(shouldRunAskFrankieHandoff(ACCOUNTS_ON), true);
});

test('websiteLink: default ON shows the one Home link; only a literal false hides it', () => {
  assert.deepEqual(WEBSITE_LINK, { label: 'More info at quitefrankly.tv', url: 'https://quitefrankly.tv' });
  assert.deepEqual(homeWebsiteLink(OFF), WEBSITE_LINK);
  assert.deepEqual(homeWebsiteLink(normalizeFlags({ websiteLink: true })), WEBSITE_LINK);
  for (const v of [undefined, null, 'false', 0, 'no']) assert.deepEqual(homeWebsiteLink(normalizeFlags({ websiteLink: v })), WEBSITE_LINK, String(v));
  assert.equal(homeWebsiteLink(normalizeFlags({ websiteLink: false })), null);
  assert.equal(parseCachedFlags('{"websiteLink":false}').websiteLink, false);
  assert.equal(parseCachedFlags(null).websiteLink, true);
  assert.equal(normalizeFlags({ accounts: true }).websiteLink, true);   // a blob that never mentioned it keeps it on
  assert.ok(!/sponsor|about|member|patron|donat/i.test(WEBSITE_LINK.url), 'only the plain site address, never a payment or membership page');
});

test('homeDestinations: a destination with a `flag` shows only when that flag is on; others always show', () => {
  const tiles = [{ label: 'Watch' }, { label: 'Gated', flag: 'accounts' }, { label: 'Shop' }];
  assert.deepEqual(homeDestinations(tiles, OFF).map((t) => t.label), ['Watch', 'Shop']);
  assert.deepEqual(homeDestinations(tiles, ACCOUNTS_ON).map((t) => t.label), ['Watch', 'Gated', 'Shop']);
});

test('hidden, not deleted: the account screens and Schedule still exist and stay registered', () => {
  const root = new URL('../../', import.meta.url);
  for (const f of ['src/screens/onboarding/Email.js', 'src/screens/onboarding/CodeEntry.js', 'src/screens/account/DeleteAccount.js', 'src/screens/account/Account.js',
    'src/screens/home/Calendar.js', 'src/lib/account.js']) {
    assert.ok(existsSync(new URL(f, root)), `${f} must still exist`);
  }
  const reg = (f) => readFileSync(new URL(f, root), 'utf8');
  assert.match(reg('src/navigation/OnboardingNavigator.js'), /name="Email"[\s\S]*name="CodeEntry"/);
  assert.match(reg('src/navigation/AccountStackNavigator.js'), /name="Account"[\s\S]*name="DeleteAccount"/);
  assert.match(reg('src/navigation/HomeStackNavigator.js'), /name="Calendar"/);
});

test('onboarding flag: OFF = Home for everyone (even an install that never finished onboarding); ON = Onboarding only until the install has reached Home', () => {
  const ONBOARDING_ON = normalizeFlags({ onboarding: true });
  for (const done of [undefined, null, false, true]) assert.equal(initialRoute(OFF, done), 'MainTabs', `OFF, done=${String(done)}`);
  assert.equal(initialRoute(ONBOARDING_ON, false), 'Onboarding');
  assert.equal(initialRoute(ONBOARDING_ON, undefined), 'Onboarding');
  assert.equal(initialRoute(ONBOARDING_ON, true), 'MainTabs');
  assert.equal(normalizeFlags({ onboarding: 'true' }).onboarding, false);      // only a literal true
  assert.equal(initialRoute(applyOverride(OFF, '{"onboarding":true}'), false), 'Onboarding');   // the dev override used for QA
  assert.equal(initialRoute(normalizeFlags(undefined), false), 'MainTabs');    // a first launch with no cached flags: no Welcome flash
});

test('hidden, not deleted: the onboarding screens and navigator still exist and stay registered', () => {
  for (const f of ['Welcome', 'NotificationsPermission', 'Email', 'CodeEntry']) assert.ok(existsSync(new URL(`../screens/onboarding/${f}.js`, import.meta.url)), f);
  const nav = readFileSync(new URL('../navigation/OnboardingNavigator.js', import.meta.url), 'utf8');
  for (const f of ['Welcome', 'NotificationsPermission', 'Email', 'CodeEntry']) assert.match(nav, new RegExp(`name="${f}"`), f);
  const root = readFileSync(new URL('../navigation/RootNavigator.js', import.meta.url), 'utf8');
  assert.match(root, /name="Onboarding" component=\{OnboardingNavigator\}/);
  assert.match(root, /initialRouteName=\{initial\.current\}/);
});

test('AskFrankie is ON by default (Play launch): the tile is there from the first launch, and only a literal false from the server turns it off', () => {
  assert.equal(FLAG_DEFAULTS.askfrankie_enabled, true);
  assert.equal(normalizeFlags(undefined).askfrankie_enabled, true);                 // first launch, nothing cached, nothing fetched
  assert.equal(parseCachedFlags(null).askfrankie_enabled, true);
  assert.equal(parseCachedFlags('{not json').askfrankie_enabled, true);
  for (const v of [undefined, null, 'false', 0, 'no', true]) assert.equal(normalizeFlags({ askfrankie_enabled: v }).askfrankie_enabled, true, String(v));
  assert.equal(normalizeFlags({ websiteLink: false }).askfrankie_enabled, true);       // a blob that never mentioned it keeps it on
  assert.equal(normalizeFlags({ askfrankie_enabled: false }).askfrankie_enabled, false);   // the kill switch
  assert.equal(parseCachedFlags('{"askfrankie_enabled":false}').askfrankie_enabled, false);
  assert.equal(applyOverride(OFF, '{"askfrankie_enabled":false}').askfrankie_enabled, false);   // the dev override is explicit
  assert.equal(normalizeFlags({ askfrankie_enabled: false, accounts: true }).accounts, true);
});

const ASK = { label: 'Ask', route: 'AskFrankie', enabledBy: 'askfrankie_enabled', subtext: 'Coming Soon', hideWhenOffOnAndroid: true };
const WATCH = { label: 'Watch', route: 'Watch' };
const GATED = { label: 'Gated', route: 'Gated', flag: 'accounts' };
const labels = (xs) => xs.map((d) => d.label);

test('Home Ask tile: ON = shown on both platforms; kill switch OFF = hidden on Android (no "Coming Soon"), still the muted "Coming Soon" tile on iOS', () => {
  const ON = normalizeFlags({});
  const KILLED = normalizeFlags({ askfrankie_enabled: false });
  assert.deepEqual(labels(homeDestinations([WATCH, ASK], ON, 'android')), ['Watch', 'Ask']);
  assert.deepEqual(labels(homeDestinations([WATCH, ASK], ON, 'ios')), ['Watch', 'Ask']);
  assert.deepEqual(labels(homeDestinations([WATCH, ASK], KILLED, 'android')), ['Watch']);
  assert.deepEqual(labels(homeDestinations([WATCH, ASK], KILLED, 'ios')), ['Watch', 'Ask']);
  assert.deepEqual(labels(homeDestinations([WATCH, ASK], KILLED)), ['Watch', 'Ask']);      // no platform given: unchanged behaviour
  assert.deepEqual(labels(homeDestinations([WATCH, GATED], ON, 'android')), ['Watch']);       // the older `flag` rule is untouched
  assert.deepEqual(labels(homeDestinations([WATCH, GATED], ACCOUNTS_ON, 'android')), ['Watch', 'Gated']);
});

test('Settings shows the Privacy Policy row with the accounts flag OFF ("Settings") and ON ("Account")', () => {
  assert.equal(accountScreen(OFF).showPrivacyRow, true);
  assert.equal(accountScreen(ACCOUNTS_ON).showPrivacyRow, true);
});

test('removed for the first release (recoverable from tag pre-link-cleanup): no screen, route or file for support / donation / Culture Club', () => {
  const root = new URL('../../', import.meta.url);
  for (const f of ['src/screens/shared/Subscription.js', 'src/screens/modal/SubscriptionCheckout.js', 'src/screens/account/DonateToApp.js', 'src/components/CryptoCard.js',
    'src/components/SponsorButton.js', 'src/screens/members/CultureClub.js', 'src/navigation/CultureClubStackNavigator.js']) {
    assert.equal(existsSync(new URL(f, root)), false, `${f} must stay removed`);
  }
  for (const f of ['src/navigation/RootNavigator.js', 'src/navigation/AccountStackNavigator.js', 'src/navigation/MainTabNavigator.js', 'src/screens/home/Home.js', 'src/screens/account/Account.js']) {
    assert.doesNotMatch(readFileSync(new URL(f, root), 'utf8'), /Subscription|DonateToApp|CultureClub|SponsorButton/, f);
  }
});

test('no plain http:// URLs ship in src/ (Play: use https; mediaUrl.js, the http->https converter, is the one file that names the scheme)', () => {
  const bad = [];
  const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.js$/.test(f) && !/\.test\.js$/.test(f) && f !== 'mediaUrl.js') for (const m of readFileSync(p, 'utf8').matchAll(/http:\/\/[^\s'"`)]+/g)) if (!/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)/.test(m[0]) && !/w3\.org/.test(m[0])) bad.push(`${p.replace(/.*\/src\//, 'src/')}: ${m[0]}`); } };
  walk(new URL('..', import.meta.url).pathname);
  assert.deepEqual(bad, []);
});
