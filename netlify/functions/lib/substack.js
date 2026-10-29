// Substack fetch/parse/map for the Writing > Substack tab. Shared by
// poll-substack.js (writes) and, for the constants only, get-substack-posts.js.
//
// Two public, unauthenticated sources (confirmed 2026-10-27, locally and from
// a deployed Netlify function -- no Cloudflare challenge, 200 for any UA):
//   - /feed  RSS 2.0, full body of free posts in <content:encoded>. Short
//     window (one item today). Feed `guid` is the post URL, NOT the archive id.
//   - /api/v1/archive?sort=new&limit=50  JSON, the authority for `audience`
//     (everyone / only_paid / founding), numeric `id`, subtitle, cover image.
// They join on slug: the segment after `/p/` in the feed `link` equals the
// archive `slug`.
//
// Paid rule: any audience other than 'everyone' is paid. A paid post never
// gets a body -- its feed <content:encoded> is not read at all, so no
// paywalled text can reach Blobs.
//
// A feed item with no archive match has an unknown audience and is skipped
// (never written): the next run picks it up once the archive lists it.
import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import { fetchWithBackoff } from './fetchWithBackoff.js';
import { normalizeBlogHtml } from './normalizeBlogHtml.js';
import { computeReadMinutes } from './squarespaceBlog.js';

export const SUBSTACK_BASE_URL = 'https://quitefranklyofficial.substack.com';
export const SUBSTACK_FEED_URL = `${SUBSTACK_BASE_URL}/feed`;
export const SUBSTACK_ARCHIVE_URL = `${SUBSTACK_BASE_URL}/api/v1/archive?sort=new&limit=50`;
export const SUBSTACK_USER_AGENT = 'QuiteFranklyApp/1.0 (+https://quitefrankly.tv; feed reader)';

// Metadata list (one key, newest first, merged by id so posts that fall out
// of the feed/archive window stay) and per-post bodies keyed by post id.
export const SUBSTACK_POSTS_STORE = 'substack-posts';
export const SUBSTACK_POSTS_KEY = 'posts';
export const SUBSTACK_BODIES_STORE = 'substack-bodies';

export const AUTHOR_FALLBACK = 'Quite Frankly';

// A new post gets a push only if published within this window, and at most
// MAX_PUSHES_PER_RUN pushes go out per run (newest kept).
export const PUSH_RECENCY_MS = 48 * 60 * 60 * 1000;
export const MAX_PUSHES_PER_RUN = 3;

const WORDS_PER_MINUTE = 200;

// ---- fetch ----

async function fetchText(url, accept, config) {
  const response = await fetchWithBackoff(url, { headers: { 'User-Agent': SUBSTACK_USER_AGENT, Accept: accept } }, config);
  if (!response.ok) {
    throw new Error(`Substack fetch failed: ${url} -> ${response.status}`);
  }
  return response.text();
}

export function fetchFeedXml(config = {}) {
  return fetchText(SUBSTACK_FEED_URL, 'application/rss+xml, application/xml', config);
}

export async function fetchArchive(config = {}) {
  const text = await fetchText(SUBSTACK_ARCHIVE_URL, 'application/json', config);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Substack archive response was not an array');
  return parsed;
}

// ---- parse ----

const feedParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  parseTagValue: false, // keep guid/title/etc. as strings
  isArray: (name) => name === 'item',
});

function text(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'object' ? String(value['#text'] ?? '') : String(value);
}

// "https://x.substack.com/p/some-slug?utm=..." -> "some-slug", else ''.
export function slugFromUrl(url) {
  const match = /\/p\/([^/?#]+)/.exec(url || '');
  return match ? decodeURIComponent(match[1]) : '';
}

// Returns one entry per feed <item>:
//   { slug, title, blurb, url, publishedAt, heroImageUrl, creator, contentHtml }
export function parseFeed(xml) {
  const doc = feedParser.parse(xml);
  const items = doc?.rss?.channel?.item ?? [];
  return items.map((item) => {
    const url = text(item.link).trim();
    const pub = new Date(text(item.pubDate));
    return {
      slug: slugFromUrl(url),
      title: text(item.title).trim(),
      blurb: text(item.description).trim(),
      url,
      publishedAt: Number.isNaN(pub.getTime()) ? '' : pub.toISOString(),
      heroImageUrl: item.enclosure?.url ? String(item.enclosure.url) : '',
      creator: text(item.creator).trim(),
      contentHtml: text(item.encoded),
    };
  });
}

// ---- mapping helpers ----

export function isPaidAudience(audience) {
  return audience !== 'everyone';
}

// Mirrors the Blog: any creator containing "Quite Frankly" (e.g. "Frank |
// Quite Frankly") shows as "Quite Frankly"; anything else shows as given;
// missing falls back.
export function resolveAuthor(creator) {
  const name = typeof creator === 'string' ? creator.trim() : '';
  if (!name) return AUTHOR_FALLBACK;
  return /quite frankly/i.test(name) ? AUTHOR_FALLBACK : name;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

// ---- body cleaner ----
//
// Strips Substack widget chrome BEFORE normalizeBlogHtml (which would
// otherwise keep the "reader-supported publication" caption and lose
// @-mention names). Deliberately tolerant: markup it doesn't recognise is a
// no-op, a post with nothing to strip is returned byte-for-byte unchanged
// (no parse/serialize round trip), and any parser error returns the input.
// Confirmed against the one real post: subscription widgets, per-image
// restack/view buttons + svg, picture>source, `a.image-link` wrappers and
// `span.mention-wrap`. The button-wrapper / share / footer selectors are
// untested guesses from Substack's usual markup.
const DROP_TAGS = new Set(['button', 'svg', 'form', 'input', 'footer', 'source']);
const DROP_CLASSES = new Set([
  'subscription-widget-wrap-editor',
  'subscription-widget-wrap',
  'subscription-widget',
  'button-wrapper',
  'post-ufi',
  'post-footer',
  'share-dialog',
  'paywall',
]);
const DROP_COMPONENTS = new Set(['SubscribeWidgetToDOM', 'ButtonCreateButton']);

const CLEAN_MARKER_RE = /subscription-widget|button-wrapper|post-ufi|post-footer|share-dialog|paywall|SubscribeWidgetToDOM|ButtonCreateButton|mention-wrap|image-link|<(?:button|svg|form|input|footer|source)\b/i;

function classTokens(node) {
  return (node.attribs?.class || '').split(/\s+/).filter(Boolean);
}

function shouldDrop(node) {
  if (DROP_TAGS.has(node.name)) return true;
  if (DROP_COMPONENTS.has(node.attribs?.['data-component-name'])) return true;
  return classTokens(node).some((c) => DROP_CLASSES.has(c));
}

function mentionName(node) {
  try {
    const name = JSON.parse(node.attribs['data-attrs']).name;
    return typeof name === 'string' ? name : '';
  } catch {
    return '';
  }
}

function cleanNodes(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type !== 'tag') {
      out.push(node);
      continue;
    }
    if (classTokens(node).includes('mention-wrap')) {
      const name = mentionName(node);
      if (name) out.push({ type: 'text', data: name });
      continue;
    }
    if (shouldDrop(node)) continue;
    node.children = cleanNodes(node.children || []);
    if (node.name === 'a' && classTokens(node).includes('image-link')) {
      out.push(...node.children); // link around an image points at the CDN file -- keep only the image
      continue;
    }
    out.push(node);
  }
  return out;
}

export function cleanSubstackHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return html ?? '';
  if (!CLEAN_MARKER_RE.test(html)) return html;
  try {
    return render(cleanNodes(parseDocument(html).children || []), { encodeEntities: 'utf8' });
  } catch (err) {
    console.error('[substack] cleanSubstackHtml failed, using input unchanged:', err.message);
    return html;
  }
}

// ---- record building ----

// Joins archive (authority: id, audience, subtitle, cover image) with the
// feed (body, creator) by slug. Returns records WITHOUT hashes:
//   { id, title, blurb, url, publishedAt, heroImageUrl, author, readMinutes,
//     audience: 'free'|'paid', bodyHtml?: string }
// `bodyHtml` exists only for free posts that are in the feed window.
// Returns { records, skippedFeedOnly } -- feed items with no archive match.
export function joinFeedAndArchive(feedItems, archiveEntries) {
  const feedBySlug = new Map(feedItems.filter((f) => f.slug).map((f) => [f.slug, f]));
  const archiveSlugs = new Set();
  const records = [];

  for (const entry of archiveEntries) {
    if (entry?.id === undefined || entry?.id === null || !entry.slug || !entry.title) continue;
    archiveSlugs.add(entry.slug);
    const feed = feedBySlug.get(entry.slug);
    const paid = isPaidAudience(entry.audience);

    const record = {
      id: String(entry.id),
      title: entry.title,
      blurb: entry.subtitle || '',
      url: entry.canonical_url || feed?.url || `${SUBSTACK_BASE_URL}/p/${entry.slug}`,
      publishedAt: entry.post_date ? new Date(entry.post_date).toISOString() : feed?.publishedAt || '',
      heroImageUrl: entry.cover_image || feed?.heroImageUrl || '',
      author: resolveAuthor(feed?.creator || entry.publishedBylines?.[0]?.name),
      readMinutes: null,
      audience: paid ? 'paid' : 'free',
    };

    if (!paid && feed?.contentHtml) {
      const bodyHtml = normalizeBlogHtml(cleanSubstackHtml(feed.contentHtml)).html;
      if (bodyHtml) {
        record.bodyHtml = bodyHtml;
        record.readMinutes = computeReadMinutes(bodyHtml);
      }
    }
    if (record.readMinutes === null && Number(entry.wordcount) > 0) {
      record.readMinutes = Math.max(1, Math.ceil(Number(entry.wordcount) / WORDS_PER_MINUTE));
    }
    records.push(record);
  }

  const skippedFeedOnly = feedItems.filter((f) => f.slug && !archiveSlugs.has(f.slug));
  return { records, skippedFeedOnly };
}

const META_FIELDS = ['title', 'blurb', 'url', 'publishedAt', 'heroImageUrl', 'author', 'readMinutes', 'audience'];

export function hashMeta(record) {
  return sha256(JSON.stringify(META_FIELDS.map((k) => record[k] ?? null)));
}

export function hashBody(bodyHtml) {
  return sha256(bodyHtml);
}

// Compares an incoming record with the stored list entry for the same id.
//   isNew        no stored entry
//   metaChanged  title/blurb/url/date/hero/author/readMinutes/audience differ
//   bodyChanged  incoming has a body and its hash differs from the stored one
//   dropBody     post flipped to paid and a stored body exists -> delete it
// `bodyHash` is what the new list entry should carry: the incoming body's
// hash, else the stored one is KEPT for a free post that has simply left the
// feed window (its stored body is still good), else null.
export function planPost(record, existing) {
  const metaHash = hashMeta(record);
  const isPaid = record.audience === 'paid';
  const incomingBodyHash = record.bodyHtml ? hashBody(record.bodyHtml) : null;

  let bodyHash = null;
  if (!isPaid) bodyHash = incomingBodyHash ?? existing?.bodyHash ?? null;

  const isNew = !existing;
  const metaChanged = !isNew && existing.metaHash !== metaHash;
  const bodyChanged = incomingBodyHash !== null && incomingBodyHash !== (existing?.bodyHash ?? null);
  const dropBody = isPaid && Boolean(existing?.bodyHash);
  const changed = isNew || metaChanged || bodyChanged || dropBody;

  return { metaHash, bodyHash, isNew, metaChanged, bodyChanged, dropBody, changed };
}

// The list-entry shape stored under SUBSTACK_POSTS_KEY (no bodyHtml).
export function toListEntry(record, { metaHash, bodyHash }) {
  const meta = { ...record };
  delete meta.bodyHtml;
  return { ...meta, metaHash, bodyHash };
}

function compareDesc(a, b) {
  if (a.publishedAt !== b.publishedAt) return a.publishedAt > b.publishedAt ? -1 : 1;
  if (a.id !== b.id) return a.id > b.id ? -1 : 1;
  return 0;
}

// Merges incoming entries into the stored list by id (incoming wins; stored
// entries absent from `incoming` stay), newest first.
export function mergeById(existing, incoming) {
  const map = new Map();
  for (const entry of existing || []) map.set(entry.id, entry);
  for (const entry of incoming) map.set(entry.id, entry);
  return [...map.values()].sort(compareDesc);
}

// Which newly-seen posts get a push. Pure.
//   - seed run (store was empty): never
//   - only posts published within PUSH_RECENCY_MS (future-dated ones count)
//   - at most `max`, newest kept, returned oldest-first so the newest push
//     lands last
export function selectPushPosts(newPosts, { isSeed, now, max = MAX_PUSHES_PER_RUN, recencyMs = PUSH_RECENCY_MS }) {
  if (isSeed) return [];
  // Launch rule: the app never shows paid posts, so never push one either (a notification for a post the list does not contain).
  const recent = newPosts.filter((p) => p.audience !== 'paid').filter((p) => {
    const t = new Date(p.publishedAt).getTime();
    return Number.isFinite(t) && now - t <= recencyMs;
  });
  recent.sort(compareDesc);
  return recent.slice(0, max).reverse();
}
