// Read function for the Writing > Substack tab. Two modes:
//   - list (default): GET -> { posts, nextCursor: null, hasMore: false }.
//     One Blobs read of the metadata list; never includes bodyHtml (or the
//     internal hashes).
//   - GET ?id=<id> -> { id, bodyHtml, readMinutes } for FREE posts only.
//     Paid -> 403 (the body blob is never even read), unknown id -> 404,
//     free post with no stored body (outside the feed window) -> 404, missing
//     id param -> 400. The app treats any non-200 as "open on Substack".
import { getJSON } from './lib/blobs.js';
import { SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY, SUBSTACK_BODIES_STORE } from './lib/substack.js';

function publicPost(entry) {
  const post = { ...entry };
  delete post.metaHash;
  delete post.bodyHash;
  return post;
}

async function readList(getJSONFn) {
  const list = await getJSONFn(SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export async function listSubstackPosts({ getJSONFn = getJSON } = {}) {
  const list = await readList(getJSONFn);
  return { posts: list.map(publicPost), nextCursor: null, hasMore: false };
}

// Returns { status, body }. status 200 -> body is { id, bodyHtml, readMinutes }.
export async function getSubstackPostById(id, { getJSONFn = getJSON } = {}) {
  if (!id) return { status: 400, body: { error: 'Missing required "id" query parameter.' } };
  const entry = (await readList(getJSONFn)).find((e) => e.id === id);
  if (!entry) return { status: 404, body: { error: `No Substack post found for id "${id}".` } };
  if (entry.audience !== 'free') {
    return { status: 403, body: { error: 'This post is for paid subscribers. Open it on Substack.' } };
  }
  const blob = await getJSONFn(SUBSTACK_BODIES_STORE, id, null);
  if (!blob?.bodyHtml) {
    return { status: 404, body: { error: `No stored text for Substack post "${id}". Open it on Substack.` } };
  }
  return { status: 200, body: { id, bodyHtml: blob.bodyHtml, readMinutes: blob.readMinutes ?? entry.readMinutes ?? null } };
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
    const { status, body } = await getSubstackPostById(url.searchParams.get('id'));
    return jsonResponse(status, body);
  }
  return jsonResponse(200, await listSubstackPosts());
};
