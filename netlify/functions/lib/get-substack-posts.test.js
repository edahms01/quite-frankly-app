import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { listSubstackPosts, getSubstackPostById } from '../get-substack-posts.js';
import { SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY, SUBSTACK_BODIES_STORE } from './substack.js';

const LIST = [
  { id: '3', title: 'Paid one', blurb: 'teaser', audience: 'paid', readMinutes: 4, metaHash: 'x', bodyHash: null },
  { id: '2', title: 'Free one', blurb: 'b', audience: 'free', readMinutes: 6, metaHash: 'y', bodyHash: 'z' },
  { id: '1', title: 'Free, no body', blurb: '', audience: 'free', readMinutes: 2, metaHash: 'y', bodyHash: null },
];
const BODIES = { '2': { bodyHtml: '<p>hi</p>', readMinutes: 6 }, '3': { bodyHtml: '<p>SECRET</p>', readMinutes: 4 } };

function store({ list = LIST } = {}) {
  const reads = [];
  const getJSONFn = async (s, key, fallback = null) => {
    reads.push(`${s}/${key}`);
    if (s === SUBSTACK_POSTS_STORE && key === SUBSTACK_POSTS_KEY) return list ?? fallback;
    if (s === SUBSTACK_BODIES_STORE) return BODIES[key] ?? fallback;
    return fallback;
  };
  return { getJSONFn, reads };
}

test('list mode: posts without bodyHtml or internal hashes, no cursor', async () => {
  const out = await listSubstackPosts(store());
  assert.deepEqual(out.nextCursor, null);
  assert.equal(out.hasMore, false);
  assert.equal(out.posts.length, 3);
  for (const p of out.posts) {
    assert.equal('bodyHtml' in p, false);
    assert.equal('metaHash' in p, false);
    assert.equal('bodyHash' in p, false);
  }
  assert.equal(out.posts[0].audience, 'paid');
});

test('list mode: empty/missing store -> empty list', async () => {
  assert.deepEqual(await listSubstackPosts(store({ list: null })), { posts: [], nextCursor: null, hasMore: false });
});

test('id mode: free post returns body + readMinutes', async () => {
  const r = await getSubstackPostById('2', store());
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { id: '2', bodyHtml: '<p>hi</p>', readMinutes: 6 });
});

test('id mode: paid post -> 403 and the body blob is never read', async () => {
  const s = store();
  const r = await getSubstackPostById('3', s);
  assert.equal(r.status, 403);
  assert.ok(!JSON.stringify(r.body).includes('SECRET'));
  assert.ok(!s.reads.some((x) => x.startsWith(`${SUBSTACK_BODIES_STORE}/`)));
});

test('id mode: unknown id -> 404; missing id -> 400; free post with no stored body -> 404', async () => {
  assert.equal((await getSubstackPostById('nope', store())).status, 404);
  assert.equal((await getSubstackPostById('', store())).status, 400);
  assert.equal((await getSubstackPostById(null, store())).status, 400);
  assert.equal((await getSubstackPostById('1', store())).status, 404);
});

test('handler: missing id param value -> 400 JSON', async () => {
  const res = await handler(new Request('https://x.test/.netlify/functions/get-substack-posts?id='));
  assert.equal(res.status, 400);
  assert.match(res.headers.get('content-type'), /json/);
});
