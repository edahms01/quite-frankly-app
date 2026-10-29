// Pure scan rules for scripts/check-bundle-links.mjs (kept separate so node --test can cover them without building anything).
// A bundle is split into Metro modules; modules that DEFINE the deny-list / hidden-row config are skipped on purpose (they have to contain the very
// strings they remove); every other module is scanned for deny-listed hosts, paths, phrases, crypto addresses and removed-screen strings.
import {
  CRYPTO_ADDRESS_PATTERNS, PAYMENT_HOSTS, PAYMENT_PATHS, PAYMENT_PHRASES,
} from '../../src/config/paymentDenyList.js';

/** Strings that only existed in removed screens / buttons. */
export const REMOVED_SCREEN_STRINGS = [
  'Support the Show', 'Support Frank Directly', 'Donate to App', 'One-Time Donation', 'Monthly Support', 'Culture Club', 'Subscribe to Read',
  'Become a Sponsor', 'Sponsor Frank', 'SubscriptionCheckout', 'DonateToApp', 'CultureClubTab', 'CultureClubStack',
];

/** Modules that must contain deny-list strings by design: the Metro module is recognised by the name of something it exports. */
export const SKIP_MODULE_MARKERS = ['"PAYMENT_HOSTS"', '"HIDDEN_SHOP_ROWS"', '"REMOVED_SCREEN_STRINGS"'];

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const HOST_RES = PAYMENT_HOSTS.map((h) => [h, new RegExp(`(?:^|[^a-z0-9-])(?:[a-z0-9-]+\\.)*${esc(h)}(?![a-z0-9-])`, 'i')]);
const PATH_RES = PAYMENT_PATHS.map(([h, p]) => [`${h}${p}`, new RegExp(`${esc(h)}${esc(p)}`, 'i')]);
// Bundle-level crypto patterns: only the unambiguous ones. The generic base58 / legacy patterns match ordinary minified identifiers and library strings.
const BUNDLE_CRYPTO = CRYPTO_ADDRESS_PATTERNS.filter((re) => /bc1|0x/.test(re.source));

export function splitModules(bundleText) {
  return bundleText.split(/\n(?=__d\()/);
}

/** Returns [{ kind, match, context }] for one chunk of text. */
export function scanText(text) {
  const hits = [];
  const lower = text.toLowerCase();
  const ctx = (i, len) => text.slice(Math.max(0, i - 30), i + len + 30).replace(/\s+/g, ' ');
  for (const [name, re] of HOST_RES) { const m = re.exec(text); if (m) hits.push({ kind: 'host', match: name, context: ctx(m.index, m[0].length) }); }
  for (const [name, re] of PATH_RES) { const m = re.exec(text); if (m) hits.push({ kind: 'path', match: name, context: ctx(m.index, m[0].length) }); }
  for (const ph of PAYMENT_PHRASES) { const i = lower.indexOf(ph); if (i >= 0) hits.push({ kind: 'phrase', match: ph, context: ctx(i, ph.length) }); }
  for (const s of REMOVED_SCREEN_STRINGS) { const i = lower.indexOf(s.toLowerCase()); if (i >= 0) hits.push({ kind: 'removed-screen', match: s, context: ctx(i, s.length) }); }
  for (const re of BUNDLE_CRYPTO) { const m = re.exec(text); if (m) hits.push({ kind: 'crypto', match: m[0], context: ctx(m.index, m[0].length) }); }
  return hits;
}

/** Scan a whole bundle. allow = [{ kind, match, reason }] exact matches that are accepted. Returns { hits, skipped, allowed }. */
export function scanBundle(bundleText, allow = []) {
  const hits = []; const allowed = []; let skipped = 0;
  for (const mod of splitModules(bundleText)) {
    if (SKIP_MODULE_MARKERS.some((m) => mod.includes(m))) { skipped++; continue; }
    for (const h of scanText(mod)) {
      const a = allow.find((x) => x.kind === h.kind && x.match.toLowerCase() === h.match.toLowerCase());
      (a ? allowed : hits).push(a ? { ...h, reason: a.reason } : h);
    }
  }
  return { hits, allowed, skipped };
}
