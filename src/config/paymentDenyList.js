// The payment / donation / membership deny-list. ONE file, so it can be extended without touching any logic. Used by:
//   - src/lib/sanitizeDescription.js (video / audio descriptions, share text, push titles: whole lines that match are removed at RENDER time)
//   - scripts/check-bundle-links.mjs (fails if the JS bundle contains any of these outside the allowlist)
// Launch rule (Eric, 2026-10-29): the app must not lead anyone to a payment, donation, tip or membership page (Google Play Payments policy section 4,
// Apple 3.1.1/3.1.3). Shop and affiliate links are NOT on this list (affiliate info, physical goods).
//
// Everything is lower-case; matching is case-insensitive.

/** Hosts (a url or bare text whose host is, or ends with, one of these). */
export const PAYMENT_HOSTS = [
  'patreon.com', 'subscribestar.com', 'subscribestar.adult',
  'paypal.com', 'paypal.me', 'ko-fi.com', 'buymeacoffee.com', 'venmo.com', 'cash.app', 'cashapp.com',
  'gofundme.com', 'givesendgo.com', 'stripe.com', 'buy.stripe.com', 'checkout.stripe.com',
  'revolut.me', 'monzo.me', 'wise.com', 'zelle.com', 'square.link', 'squareup.com', 'square.site',
  'gumroad.com', 'streamlabs.com', 'streamelements.com', 'donorbox.org', 'liberapay.com', 'thanks.dev',
  // Added beyond the first list (flagged in the PR; delete the line to undo): the gold dealer whose Shop card was removed.
  'quitefrankly.gold',
];

/** Path rules: [host, path-prefix]. quitefrankly.tv/sponsor is the Culture Club / patron sign-up. */
export const PAYMENT_PATHS = [
  ['quitefrankly.tv', '/sponsor'],
  ['quitefrankly.tv', '/patrons-products'],
  ['quitefrankly.tv', '/cart'],
  ['quitefrankly.tv', '/checkout'],
  ['quitefrankly.tv', '/member-lounge'],
  ['quitefrankly.tv', '/culture-club'],
];

/** Substack: only the subscribe / upgrade / checkout pages count; the publication's ordinary pages are fine. */
export const PAYMENT_SUBSTACK_PATHS = ['/subscribe', '/upgrade', '/checkout'];

/** Phrases (a line containing one is removed). */
export const PAYMENT_PHRASES = [
  'join the culture club', 'culture club', 'one-time tip', 'one time tip', 'tip in crypto', 'super chat', 'superchat', 'become a patron',
  'support the show', 'donate', 'donation', 'patreon', 'subscribestar', 'paypal',
  // Added beyond the first list (flagged in the PR): the heading on the SoundCloud support block.
  'support quite frankly',
];

/** Crypto receive-address patterns (a line containing one is removed). Deliberately a little greedy: a false positive only drops one line of a description. */
export const CRYPTO_ADDRESS_PATTERNS = [
  /\bbc1[a-z0-9]{25,62}\b/i,                         // Bitcoin bech32
  /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/,             // Bitcoin legacy / P2SH
  /\b0x[a-fA-F0-9]{40}\b/,                           // Ethereum and EVM chains
  /\br[1-9A-HJ-NP-Za-km-z]{24,34}\b/,                // XRP classic address
  /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/,                 // Solana (base58)
  /\bD[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}\b/,     // Dogecoin
];

/** Crypto words (a line that is just a coin label / mentions a wallet or address for it). */
export const CRYPTO_WORDS = [/\b(btc|xrp|bitcoin|ethereum|solana|dogecoin|crypto(currency)?)\b.*\b(address|wallet|tip|donat)/i, /\b(address|wallet)\b.*\b(btc|xrp|bitcoin|ethereum|solana|dogecoin)\b/i, /^\s*(btc|xrp|eth|sol|doge|bitcoin|ethereum)\s*[:\-]/i];

/** Everything above as plain strings, for the bundle scanner (removed-screen strings are listed there separately). */
export const BUNDLE_DENY_HOSTS = PAYMENT_HOSTS;
