// The ownership notice on Settings and the wording of the app privacy page. Pure checks (node --test): React Native screens can not be rendered here, so the
// screen is pinned by reading its source, and the layout maths by the pure helper it uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeFlags, accountScreen } from './featureFlags.js';
import { OWNERSHIP_NOTICE, PRIVACY_POLICY_URL } from '../config/legal.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const EXACT = '© 2026 DahmsIO LTD (app software and design). The Quite Frankly name, logos, episodes and show content belong to Frank / Quite Frankly. Any other names, logos and embedded content belong to their owners.';

test('the ownership notice is exactly the approved wording (no "used with permission" yet)', () => {
  assert.equal(OWNERSHIP_NOTICE, EXACT);
  assert.doesNotMatch(OWNERSHIP_NOTICE, /permission/i);
});

test('the notice string lives in one place only (src/config/legal.js)', () => {
  const hits = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(f) && readFileSync(p, 'utf8').includes('belong to Frank / Quite Frankly')) hits.push(p.replace(/.*\/src\//, 'src/'));
    }
  };
  walk(new URL('../', import.meta.url).pathname);
  assert.deepEqual(hits.sort(), ['src/config/legal.js', 'src/lib/ownershipNotice.test.js']);
});

test('Settings shows the notice with the accounts flag OFF ("Settings") and ON ("Account")', () => {
  const OFF = accountScreen(normalizeFlags({}));
  const ON = accountScreen(normalizeFlags({ accounts: true }));
  assert.equal(OFF.title, 'Settings'); assert.equal(OFF.showOwnershipNotice, true);
  assert.equal(ON.title, 'Account'); assert.equal(ON.showOwnershipNotice, true);
});

test('Account.js renders the notice from the constant, AFTER every row (rows, Sign Out and Delete Account), inside the scrolling body', () => {
  const src = read('../screens/account/Account.js');
  assert.match(src, /import \{ OWNERSHIP_NOTICE, PRIVACY_POLICY_URL \} from '\.\.\/\.\.\/config\/legal'/);
  assert.match(src, /view\.showOwnershipNotice \? <Text style=\{styles\.notice\}>\{OWNERSHIP_NOTICE\}<\/Text> : null/);
  const at = (needle) => src.indexOf(needle);
  assert.ok(at('{OWNERSHIP_NOTICE}') > at('Delete Account'), 'after Delete Account');
  assert.ok(at('{OWNERSHIP_NOTICE}') > at('Report a Bug / Request Features'), 'after the last row');
  assert.ok(at('<ScrollView') < at('{OWNERSHIP_NOTICE}') && at('{OWNERSHIP_NOTICE}') < at('</ScrollView>'), 'inside the ScrollView');
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'design tokens only');
});

test('the MiniPlayer never renders over Settings (it only shows on the main tabs), so no extra bottom clearance is needed; the notice only clears the system bar', () => {
  const mini = read('../components/MiniPlayer.js');
  assert.match(mini, /if \(!currentTrack \|\| !onMainTabs\) return null;/);
  const account = read('../screens/account/Account.js');
  assert.match(account, /paddingBottom: bottomPad/);
  assert.match(account, /const bottomPad = insets\.bottom \+ spacing\.lg;/);
});

test('app privacy page: retired sign-in wording is gone, the approved guest-only wording is in, the date is updated, delete-account.html is unchanged in role', () => {
  const html = read('../../netlify/public/privacy.html');
  const text = html.replace(/<[^>]*>/g, '');
  for (const gone of ['Resend', '6-digit code', 'A sign-in code', 'A session token', 'open Account, then Delete Account', 'Delete your account and data', 'only if you sign in']) assert.ok(!text.includes(gone), `still contains: ${gone}`);
  for (const want of [
    'the app no longer offers sign-in and does not ask for your email. If you signed in on an earlier test version, we still hold your email address and account data until you ask us to delete them.',
    'opens inside the app as a guest, and the app sends AskFrankie nothing about you.',
    'If you signed in on an earlier test version, your account data is kept until you ask us to delete it. Deleting it removes your email address',
    'Delete your data',
    'The app no longer has accounts. To have an earlier account or any other data deleted, use the web deletion page',
    'Last updated: 29 October 2026',
  ]) assert.ok(text.includes(want), `missing: ${want}`);
  assert.match(html, /href="delete-account\.html"/);       // existing accounts can still be deleted on the web
});

test('Settings > Privacy Policy opens the app privacy page in the in-app browser, sits with the other rows ABOVE the ownership notice, and is shown whatever the accounts flag says', () => {
  assert.equal(PRIVACY_POLICY_URL, 'https://quite-frankly-app.netlify.app/privacy.html');
  const src = read('../screens/account/Account.js');
  assert.match(src, /view\.showPrivacyRow \? \(/);
  assert.match(src, /WebBrowser\.openBrowserAsync\(PRIVACY_POLICY_URL, \{ dismissButtonStyle: 'close' \}\)/);
  assert.match(src, /<Text style=\{styles\.rowLabel\}>Privacy Policy<\/Text>/);
  assert.ok(src.indexOf('Privacy Policy</Text>') < src.indexOf('{OWNERSHIP_NOTICE}'), 'above the notice');
});

test('app privacy page: the YouTube API Services paragraph is in, word for word, with both policy URLs as links, and the #58 wording is still there', () => {
  const html = read('../../netlify/public/privacy.html');
  const text = html.replace(/<[^>]*>/g, '').replace(/&rsquo;/g, '\u2019');
  assert.ok(text.includes('This app uses YouTube API Services. By using the app\u2019s YouTube features you also agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms) and Google\u2019s Privacy Policy (https://policies.google.com/privacy).'));
  assert.match(html, /<a href="https:\/\/www\.youtube\.com\/t\/terms">https:\/\/www\.youtube\.com\/t\/terms<\/a>/);
  assert.match(html, /<a href="https:\/\/policies\.google\.com\/privacy">https:\/\/policies\.google\.com\/privacy<\/a>/);
  assert.ok(html.indexOf('Who we share it with') < html.indexOf('This app uses YouTube API Services') && html.indexOf('This app uses YouTube API Services') < html.indexOf('Some of these providers are based in the US'));
  assert.ok(text.includes('Last updated: 29 October 2026'));
  assert.ok(text.includes('The app no longer has accounts.'));            // #58 edits kept
});
