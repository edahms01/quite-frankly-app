// Strips payment / donation / membership text out of video and audio descriptions (and any other episode text) at RENDER time, so old and new items are
// covered without re-ingesting anything. Pure (no React, no native modules): node --test runs it, the Netlify push functions import it, and
// scripts/verify-descriptions.mjs runs it over the live feeds. The rules live in src/config/paymentDenyList.js.
//
// A short line is removed when it contains a deny-listed host or path (so a tappable link goes with it), a deny-listed phrase, a crypto address or a coin label.
// A short label line directly above a removed line ("One-Time Tip:", "Gold & Silver:") goes too. Everything else, including Amazon / coffee / merch
// shop lines and the mail address, stays (shop and affiliate info, not payment asks). If nothing is left the result is the empty string.
import {
  CRYPTO_ADDRESS_PATTERNS, CRYPTO_WORDS, PAYMENT_HOSTS, PAYMENT_PATHS, PAYMENT_PHRASES, PAYMENT_SUBSTACK_PATHS,
} from '../config/paymentDenyList.js';

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// host match: not preceded by a letter/digit/hyphen (so "notpaypal.com" does not match), optional subdomains are covered by that rule
const HOST_RE = new RegExp(`(?:^|[^a-z0-9-])(?:[a-z0-9-]+\\.)*(?:${PAYMENT_HOSTS.map(esc).join('|')})(?![a-z0-9-])`, 'i');
const PATH_RES = PAYMENT_PATHS.map(([host, path]) => new RegExp(`${esc(host)}(?::\\d+)?${esc(path)}(?![a-z0-9-])`, 'i'));
const SUBSTACK_RE = new RegExp(`substack\\.com[^\\s]*(?:${PAYMENT_SUBSTACK_PATHS.map(esc).join('|')})(?![a-z0-9-])`, 'i');

/** Which rule removes this line? Returns a short reason string, or null if the line is fine. */
export function paymentReason(line) {
  if (typeof line !== 'string' || !line.trim()) return null;
  const lower = line.toLowerCase();
  if (HOST_RE.test(line)) return 'host';
  if (PATH_RES.some((re) => re.test(line))) return 'path';
  if (SUBSTACK_RE.test(line)) return 'substack';
  const phrase = PAYMENT_PHRASES.find((ph) => lower.includes(ph));
  if (phrase) return `phrase:${phrase}`;
  if (CRYPTO_ADDRESS_PATTERNS.some((re) => re.test(line))) return 'crypto-address';
  if (CRYPTO_WORDS.some((re) => re.test(line))) return 'crypto-word';
  return null;
}

// A "label" line: short, no URL, ends with ':' or '-' (e.g. "One-Time Tip:", "Gold & Silver:", "TIP IN CRYPTO:").
const isLabel = (line) => {
  const t = line.trim();
  return t.length > 0 && t.length <= 80 && !/https?:\/\/|www\./i.test(t) && /[:\-]$/.test(t);
};

/** Every line that would be removed, with its reason (for the verifier and the tests). */
export function findPaymentHits(text) {
  if (typeof text !== 'string') return [];
  return text.split(/\r?\n/).map((line) => ({ line, reason: paymentReason(line) })).filter((h) => h.reason);
}

export function containsPaymentText(text) {
  return findPaymentHits(text).length > 0;
}

// A long line is prose (an episode summary paragraph), not a link or a label. If it has a hit, only the offending SENTENCES go; the rest of the paragraph stays.
// Short lines (links, labels, addresses) are all-or-nothing as above.
const LONG_LINE = 140;
function trimProseLine(line) {
  if (line.length <= LONG_LINE) return null;
  const sentences = line.split(/(?<=[.!?])\s+/);
  if (sentences.length < 2) return null;
  const kept = sentences.filter((sn) => paymentReason(sn) === null);
  return kept.length === 0 || kept.length === sentences.length ? null : kept.join(' ');
}

export function sanitizeDescription(text) {
  if (typeof text !== 'string' || !text) return '';
  const lines = text.split(/\r?\n/).map((l) => (paymentReason(l) !== null ? (trimProseLine(l) ?? l) : l));
  const drop = lines.map((l) => paymentReason(l) !== null);
  // a label line directly above a removed line goes with it (chain upwards)
  for (let i = 1; i < lines.length; i++) {
    if (drop[i] && !drop[i - 1] && isLabel(lines[i - 1])) drop[i - 1] = true;
  }
  const kept = lines.filter((_, i) => !drop[i]);
  return kept.join('\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** What a description card shows: the first `previewLines` of the SANITIZED text, whether "Show more" is needed, and the full sanitized text. Empty = show nothing at all. */
export function describe(text, previewLines = 10) {
  const full = sanitizeDescription(text);
  const lines = full ? full.split('\n') : [];
  return { full, preview: lines.slice(0, previewLines).join('\n'), isLong: lines.length > previewLines, isEmpty: full === '' };
}
