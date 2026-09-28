// Read function for the Writing -> Newsletter native-reading feature.
// Structurally mirrors get-blog-posts.js (same handler mechanics, same
// opaque-composite-cursor discipline), extended for two source tabs merged
// into one list, plus two auxiliary modes the UI's filters are driven from.
// Four modes, selected by which query params are present:
//   - list mode (default): GET ?cursor&limit&category&month -- merges
//     'newsletter posts' + 'bulletins' into one newest-first list.
//   - single-post mode: GET ?id=<id> -- direct Netlify Blobs read by post
//     id (posts only; bulletins have no body, never requested this way).
//   - GET ?mode=months -- distinct YYYY-MM (UTC) values with at least one
//     post or bulletin, newest first. Feeds the month-card row; not itself
//     scoped by an active category (Eric's call: the month row is a fixed
//     navigational aid).
//   - GET ?mode=categories -- chips: [{value, label, count}], ordered by
//     count desc (Eric's call, so a new category appears on its own
//     without an app update -- the chip list is never hardcoded client-
//     side). `label` comes from CATEGORY_DISPLAY_LABELS, falling back to
//     the raw value for anything unmapped.
//   - GET ?mode=findByUrl&url=<url> -- resolves a full post item by exact
//     URL match, for BulletinViewer.js's in-email link interception (an
//     inline newsletter-content link in a bulletin's body only carries a
//     URL, not the post id Article needs to fetch its body). {post: null}
//     when nothing matches.
import { getRows, NEWSLETTER_POSTS_TAB, NEWSLETTER_POSTS_HEADER, BULLETINS_TAB, BULLETINS_HEADER } from './lib/sheets.js';
import { getJSON } from './lib/blobs.js';
import { NEWSLETTER_BODIES_STORE, displayLabelForCategory } from './lib/squarespaceNewsletter.js';

const DEFAULT_LIMIT = 15;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;

export function clampLimit(raw) {
  if (raw === null || raw === undefined || raw === '') return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.floor(n)));
}

function rowToPost(row) {
  const post = { type: 'post' };
  NEWSLETTER_POSTS_HEADER.forEach((field, i) => {
    post[field] = row[i];
  });
  post.categories = post.categories ? post.categories.split(',').filter(Boolean) : [];
  return post;
}

function rowToBulletin(row) {
  const bulletin = { type: 'bulletin' };
  BULLETINS_HEADER.forEach((field, i) => {
    bulletin[field] = row[i];
  });
  return bulletin;
}

// Every merged item's sort identity for the cursor/compare. Bulletins and
// posts are independent id spaces (separate Sheet tabs) -- prefixing
// bulletin ids keeps a coincidental id+publishedAt collision between the
// two from being treated as the same item and silently skipped across a
// page boundary. The PUBLIC `id` field on the item itself stays raw
// (React keys / nav params); only this internal sortId carries the prefix.
function sortIdOf(item) {
  return item.type === 'bulletin' ? `bulletin:${item.id}` : item.id;
}

function compareDesc(a, b) {
  if (a.publishedAt !== b.publishedAt) return a.publishedAt > b.publishedAt ? -1 : 1;
  const aId = sortIdOf(a);
  const bId = sortIdOf(b);
  if (aId !== bId) return aId > bId ? -1 : 1;
  return 0;
}

function buildCursor(item) {
  return `${item.publishedAt}|${sortIdOf(item)}`;
}

// Cursor is opaque to the app -- same "only ever parse what buildCursor
// itself produced" discipline as get-blog-posts.js. `sortId` here is
// compared directly against sortIdOf(item), so it still carries the
// bulletin: prefix when present.
function parseCursor(raw) {
  if (!raw) return null;
  const sep = raw.indexOf('|');
  if (sep === -1) return null;
  return { publishedAt: raw.slice(0, sep), sortId: raw.slice(sep + 1) };
}

function compareDescAgainstCursorPair(item, cursorPair) {
  if (item.publishedAt !== cursorPair.publishedAt) return item.publishedAt > cursorPair.publishedAt ? -1 : 1;
  const itemSortId = sortIdOf(item);
  if (itemSortId !== cursorPair.sortId) return itemSortId > cursorPair.sortId ? -1 : 1;
  return 0;
}

// UTC YYYY-MM slice -- publishedAt is always a fixed toISOString() string
// (mapItemToNewsletterPost / the bulletins tab, hand-entered as ISO too),
// so a plain string slice is UTC by construction, no Date-object timezone
// math involved. Row dates in the UI use the same slice for month
// grouping, so a row can never land under a different month than the one
// it's bucketed under (Eric's explicit addition).
function monthOf(item) {
  return (item.publishedAt || '').slice(0, 7);
}

async function loadMergedItems(getRowsFn) {
  const [postRows, bulletinRows] = await Promise.all([
    getRowsFn(NEWSLETTER_POSTS_TAB, 'A:I'),
    getRowsFn(BULLETINS_TAB, 'A:D'),
  ]);
  const posts = postRows.slice(1).map(rowToPost);
  const bulletins = bulletinRows.slice(1).map(rowToBulletin);
  return [...posts, ...bulletins];
}

// List mode's actual logic. `getRowsFn` is an injected test seam (defaults
// to the real getRows), same pattern as get-blog-posts.js's listBlogPosts.
export async function listNewsletterItems({ cursor, limit, category, month, getRowsFn = getRows } = {}) {
  const clampedLimit = clampLimit(limit);
  const merged = await loadMergedItems(getRowsFn);

  let filtered = merged;
  if (category) {
    // Bulletins carry no category data -- a specific category filter
    // always excludes them (Eric's call). Posts match on ANY of their
    // categories, not just the primary one, so "May Crowning" (Submissions
    // + Prayer of the Month) appears under either chip.
    filtered = filtered.filter((item) => item.type === 'post' && item.categories.includes(category));
  }
  if (month) {
    filtered = filtered.filter((item) => monthOf(item) === month);
  }

  const sorted = filtered.sort(compareDesc);
  const cursorPair = parseCursor(cursor);
  const eligible = cursorPair ? sorted.filter((item) => compareDescAgainstCursorPair(item, cursorPair) > 0) : sorted;

  const page = eligible.slice(0, clampedLimit);
  const hasMore = eligible.length > page.length;
  // nextCursor is built from the raw (pre-display-mapping) page items --
  // sortIdOf/compareDesc never look at `category`, so this ordering is
  // safe regardless of when the display-label swap below happens.
  const nextCursor = hasMore ? buildCursor(page[page.length - 1]) : null;

  // Swap the primary category's raw value for its display label here, at
  // the very end -- once, in the one function this whole feature's pills
  // (the merged list's row pill and Article's pill, via route.params.post)
  // both ultimately read from. Filtering above already happened against
  // the raw `categories` array, so this has no effect on which items
  // matched -- purely a display-time relabeling of the output.
  const displayPage = page.map((item) => (item.type === 'post' ? { ...item, category: displayLabelForCategory(item.category) } : item));

  return { items: displayPage, nextCursor, hasMore };
}

// Distinct UTC months with at least one post or bulletin, newest first.
// Deliberately unscoped by category (see the file-header comment).
export async function listNewsletterMonths({ getRowsFn = getRows } = {}) {
  const merged = await loadMergedItems(getRowsFn);
  const months = new Set(merged.map(monthOf).filter(Boolean));
  return [...months].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

// Chips: every raw category value found in the data, with its display
// label and post count, ordered by count desc -- never hardcoded client-
// side, so a brand-new category shows up on its own. Bulletins have no
// categories and never contribute here.
export async function listNewsletterCategories({ getRowsFn = getRows } = {}) {
  const merged = await loadMergedItems(getRowsFn);
  const counts = new Map();
  for (const item of merged) {
    if (item.type !== 'post') continue;
    for (const cat of item.categories) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: displayLabelForCategory(value), count }))
    .sort((a, b) => b.count - a.count);
}

// Resolves a full post item (same shape as a list-mode item, display-label
// mapped) by its exact `url` -- feeds BulletinViewer.js's in-email-link
// interception: a bulletin's HTML body links to a newsletter-content post
// by URL, not by id, so Article (which needs post.id to fetch its body)
// can't be opened from that link without this lookup first. Returns null
// for no match (a link to something other than a real post, or a stale
// URL) -- the caller falls back to opening it in the system browser.
export async function findNewsletterPostByUrl(url, { getRowsFn = getRows } = {}) {
  if (!url) return null;
  const merged = await loadMergedItems(getRowsFn);
  const match = merged.find((item) => item.type === 'post' && item.url === url);
  if (!match) return null;
  return { ...match, category: displayLabelForCategory(match.category) };
}

// Single-post mode's actual logic -- posts only, mirrors
// get-blog-posts.js's getBlogPostById exactly.
export async function getNewsletterPostById(id, { getJSONFn = getJSON } = {}) {
  if (!id) return null;
  const blob = await getJSONFn(NEWSLETTER_BODIES_STORE, id, null);
  if (!blob) return null;
  return { id, bodyHtml: blob.bodyHtml, readMinutes: blob.readMinutes };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req) => {
  const url = new URL(req.url);

  if (url.searchParams.has('id')) {
    const id = url.searchParams.get('id');
    const post = await getNewsletterPostById(id);
    if (!post) {
      return jsonResponse(400, { error: id ? `No newsletter post found for id "${id}".` : 'Missing required "id" query parameter.' });
    }
    return jsonResponse(200, post);
  }

  const mode = url.searchParams.get('mode');
  if (mode === 'months') {
    return jsonResponse(200, { months: await listNewsletterMonths() });
  }
  if (mode === 'categories') {
    return jsonResponse(200, { categories: await listNewsletterCategories() });
  }
  if (mode === 'findByUrl') {
    const targetUrl = url.searchParams.get('url');
    const post = await findNewsletterPostByUrl(targetUrl);
    return jsonResponse(200, { post });
  }

  const result = await listNewsletterItems({
    cursor: url.searchParams.get('cursor'),
    limit: url.searchParams.get('limit'),
    category: url.searchParams.get('category'),
    month: url.searchParams.get('month'),
  });
  return jsonResponse(200, result);
};
