// Read function (Task 4) for the Writing -> Blog native-reading feature.
// Two independent modes, selected by which query params are present:
//   - list mode (default): GET ?cursor=<opaque>&limit=<n> -- paginates the
//     'blog posts' Sheet tab (metadata only, A-H, no bodyHtml -- see Task 2's
//     post-ruling design). Never touches Blobs.
//   - single-post mode: GET ?id=<id> -- direct Netlify Blobs read by post
//     id, no Sheets call at all. bodyHtml only ever comes back from this
//     mode (Global Constraints: list responses never include bodyHtml).
//
// Handler mechanics (plain `export default async (req) => {...}`, Response/
// JSON header shape, query-param parsing off `req.url`) follow this repo's
// existing read-function convention (get-youtube-episodes.js,
// get-soundcloud-episodes.js). The response *shape* deliberately differs
// from those two's offset/limit/total model -- list mode here uses an
// opaque composite cursor instead (Global Constraints: "the app only ever
// echoes back a nextCursor it was given -- never construct/parse a cursor
// client-side").
import { getRows, BLOG_POSTS_TAB, BLOG_POSTS_HEADER } from './lib/sheets.js';
import { getJSON } from './lib/blobs.js';
import { BLOG_BODIES_STORE } from './lib/squarespaceBlog.js';

const DEFAULT_LIMIT = 15;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;

// Server-side clamp: omitted/non-numeric -> the default; a numeric value
// outside [1, 20] is clamped to the nearest bound, not rejected.
export function clampLimit(raw) {
  if (raw === null || raw === undefined || raw === '') return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.floor(n)));
}

// Maps one Sheet row-array to a post object using BLOG_POSTS_HEADER's field
// order -- derived from the constant, never a separately hardcoded list of
// column positions, so a future header change can't silently desync this.
function rowToPost(row) {
  const post = {};
  BLOG_POSTS_HEADER.forEach((field, i) => {
    post[field] = row[i];
  });
  return post;
}

// Descending comparator on (publishedAt, id) -- negative when `a` ranks
// before `b` (i.e. `a` is newer, or equal-publishedAt-and-greater-id).
// publishedAt is a fixed-format ISO-8601 string (mapItemToPost's
// toISOString()), so plain string comparison already matches chronological
// order.
function compareDesc(a, b) {
  if (a.publishedAt !== b.publishedAt) return a.publishedAt > b.publishedAt ? -1 : 1;
  if (a.id !== b.id) return a.id > b.id ? -1 : 1;
  return 0;
}

function buildCursor(post) {
  return `${post.publishedAt}|${post.id}`;
}

// Cursor is opaque to the app -- the only shape ever parsed here is the one
// this function itself produces: "<ISO publishedAt>|<id>". Split on the
// FIRST '|': publishedAt is a fixed ISO string that never contains '|', so
// everything after that first delimiter is the id, even in the (unseen in
// practice) case an id contained one itself.
function parseCursor(raw) {
  if (!raw) return null;
  const sep = raw.indexOf('|');
  if (sep === -1) return null;
  return { publishedAt: raw.slice(0, sep), id: raw.slice(sep + 1) };
}

// List mode's actual logic. `getRowsFn` is an injected test seam (defaults
// to the real getRows) so this is unit-testable with mocked Sheet rows --
// no live Sheets credentials needed.
export async function listBlogPosts({ cursor, limit, getRowsFn = getRows } = {}) {
  const clampedLimit = clampLimit(limit);
  const rows = await getRowsFn(BLOG_POSTS_TAB, 'A:H');
  const dataRows = rows.slice(1); // row 1 is the header; getRows does no header handling itself (sheets.js convention)
  const sorted = dataRows.map(rowToPost).sort(compareDesc);

  const cursorPair = parseCursor(cursor);
  // Strictly AFTER the cursor pair in the sorted (descending) order -- not
  // `<` alone, not `<=` alone, so two posts sharing an exact publishedAt
  // can't be skipped or duplicated across a page boundary.
  const eligible = cursorPair ? sorted.filter((post) => compareDesc(post, cursorPair) > 0) : sorted;

  const page = eligible.slice(0, clampedLimit);
  const hasMore = eligible.length > page.length;
  const nextCursor = hasMore ? buildCursor(page[page.length - 1]) : null;

  return { posts: page, nextCursor, hasMore };
}

// Single-post mode's actual logic. `getJSONFn` is an injected test seam
// (defaults to the real getJSON) -- no live Blobs credentials needed for
// tests. Returns null for "no such post" (missing/falsy id, or no matching
// blob) -- the caller (the default handler below) turns that into a 400.
export async function getBlogPostById(id, { getJSONFn = getJSON } = {}) {
  if (!id) return null;
  const blob = await getJSONFn(BLOG_BODIES_STORE, id, null);
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

  // id present (even as an empty string) -> single-post mode. id absent
  // entirely -> list mode is the default.
  if (url.searchParams.has('id')) {
    const id = url.searchParams.get('id');
    const post = await getBlogPostById(id);
    if (!post) {
      return jsonResponse(400, { error: id ? `No blog post found for id "${id}".` : 'Missing required "id" query parameter.' });
    }
    return jsonResponse(200, post);
  }

  const result = await listBlogPosts({
    cursor: url.searchParams.get('cursor'),
    limit: url.searchParams.get('limit'),
  });
  return jsonResponse(200, result);
};
