// Tests for poll-substack.js orchestration: seed, push rule, merge, paid
// handling, abort paths, dry run. Everything is injected (fetch, in-memory
// Blobs, push) -- no network, no Blobs credentials, no real push.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPollSubstack, config, POLL_SCHEDULE } from '../poll-substack.js';
import { SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY, SUBSTACK_BODIES_STORE, SUBSTACK_FEED_URL, SUBSTACK_ARCHIVE_URL } from './substack.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const FEED_XML = readFileSync(join(dir, 'substack-feed.xml'), 'utf8');
const ARCHIVE = JSON.parse(readFileSync(join(dir, 'substack-archive.json'), 'utf8'));
const REAL = ARCHIVE[0]; // published 2026-10-26T13:49:18.786Z

const HOUR = 3600_000;
const NOW_RECENT = Date.parse('2026-10-27T12:00:00.000Z'); // real post is 22h old
const NOW_LATER = Date.parse('2026-11-03T12:00:00.000Z');

function memory() {
  const data = new Map();
  const k = (s, key) => `${s}/${key}`;
  return {
    data,
    getJSONFn: async (s, key, fallback = null) => data.get(k(s, key)) ?? fallback,
    setJSONFn: async (s, key, value) => { data.set(k(s, key), structuredClone(value)); },
    deleteFn: async (s, key) => { data.delete(k(s, key)); },
    list: () => data.get(k(SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY)),
    body: (id) => data.get(k(SUBSTACK_BODIES_STORE, id)),
  };
}

function fetcher({ feed = FEED_XML, archive = ARCHIVE, feedStatus = 200, archiveStatus = 200 } = {}) {
  return {
    fetchImpl: async (url) => {
      if (url === SUBSTACK_FEED_URL) return new Response(feedStatus === 200 ? feed : 'nope', { status: feedStatus });
      if (url === SUBSTACK_ARCHIVE_URL) return new Response(archiveStatus === 200 ? JSON.stringify(archive) : 'nope', { status: archiveStatus });
      throw new Error(`unexpected url ${url}`);
    },
    sleepFn: async () => {},
  };
}

function push() {
  const calls = { tokens: [], sends: [] };
  return {
    calls,
    getTokensFn: async (pref) => { calls.tokens.push(pref); return ['ExponentPushToken[abc]']; },
    sendPushFn: async (tokens, msg) => { calls.sends.push({ tokens, msg }); return { sent: tokens.length }; },
  };
}

// A second post, published `hoursBeforeNow` before NOW_RECENT, free, not in the feed.
const extra = (id, slug, hoursBeforeNow, audience = 'everyone') => ({
  ...REAL, id, slug, title: `Post ${slug}`, canonical_url: `https://quitefranklyofficial.substack.com/p/${slug}`,
  post_date: new Date(NOW_RECENT - hoursBeforeNow * HOUR).toISOString(), audience, subtitle: `blurb ${slug}`,
});

test('POLL_SCHEDULE is every 6 hours and matches the literal Netlify reads', () => {
  assert.equal(POLL_SCHEDULE, '0 */6 * * *');
  assert.equal(config.schedule, POLL_SCHEDULE);
});

test('first run on an empty store seeds silently: real post written, NO push', async () => {
  const mem = memory();
  const p = push();
  const result = await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT });
  assert.equal(result.seed, true);
  assert.equal(p.calls.tokens.length, 0);
  assert.equal(p.calls.sends.length, 0);
  assert.equal(mem.list().length, 1);
  assert.equal(mem.list()[0].id, '222067800');
  assert.equal('bodyHtml' in mem.list()[0], false);
  assert.ok(mem.body('222067800').bodyHtml.length > 5000);
});

test('second run with nothing changed: nothing written, no push', async () => {
  const mem = memory();
  const p = push();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT });
  const before = JSON.stringify([...mem.data.entries()]);
  const result = await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT });
  assert.equal(result.seed, false);
  assert.equal(result.unchanged, 1);
  assert.equal(result.written, 0);
  assert.equal(p.calls.sends.length, 0);
  assert.equal(JSON.stringify([...mem.data.entries()]), before);
});

test('new + recent post pushes once with the right title/body and the substack preference', async () => {
  const mem = memory();
  const p = push();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT }); // seed
  const result = await runPollSubstack({ fetchConfig: fetcher({ archive: [extra(900, 'fresh', 2), REAL] }), ...mem, ...p, now: () => NOW_RECENT });
  assert.deepEqual(result.pushPosts, ['900']);
  assert.deepEqual(p.calls.tokens, ['substack']);
  assert.equal(p.calls.sends.length, 1);
  assert.deepEqual(p.calls.sends[0].msg, { title: 'New from Frank on Substack', body: 'Post fresh' });
  assert.equal(mem.list().length, 2);
  assert.equal(mem.list()[0].id, '900'); // newest first
});

test('new but older than 48h: stored, no push', async () => {
  const mem = memory();
  const p = push();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT });
  const result = await runPollSubstack({ fetchConfig: fetcher({ archive: [extra(901, 'stale', 72), REAL] }), ...mem, ...p, now: () => NOW_RECENT });
  assert.equal(result.newPosts, 1);
  assert.equal(p.calls.sends.length, 0);
  assert.equal(mem.list().length, 2);
});

test('existing post (even if edited) never pushes; the edit is written', async () => {
  const mem = memory();
  const p = push();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT });
  const edited = [{ ...REAL, title: 'Edited title' }];
  const result = await runPollSubstack({ fetchConfig: fetcher({ archive: edited }), ...mem, ...p, now: () => NOW_RECENT });
  assert.equal(result.written, 1);
  assert.equal(result.newPosts, 0);
  assert.equal(p.calls.sends.length, 0);
  assert.equal(mem.list()[0].title, 'Edited title');
});

test('a push failure never fails the poll, and the post is not re-pushed next run', async () => {
  const mem = memory();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...push(), now: () => NOW_RECENT });
  const archive = [extra(902, 'boom', 1), REAL];
  const failing = { getTokensFn: async () => { throw new Error('blobs down'); }, sendPushFn: async () => { throw new Error('expo down'); } };
  const result = await runPollSubstack({ fetchConfig: fetcher({ archive }), ...mem, ...failing, now: () => NOW_RECENT });
  assert.equal(result.written, 1);
  assert.equal(result.pushed, 0);
  const p = push();
  await runPollSubstack({ fetchConfig: fetcher({ archive }), ...mem, ...p, now: () => NOW_RECENT });
  assert.equal(p.calls.sends.length, 0);
});

test('push is capped at 3 per run', async () => {
  const mem = memory();
  const p = push();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT });
  const archive = [1, 2, 3, 4, 5].map((n) => extra(910 + n, `n${n}`, n)).concat(REAL);
  await runPollSubstack({ fetchConfig: fetcher({ archive }), ...mem, ...p, now: () => NOW_RECENT });
  assert.equal(p.calls.sends.length, 3);
});

test('paid post: list entry only, no body blob, no paywalled text stored', async () => {
  const mem = memory();
  const archive = [{ ...REAL, audience: 'only_paid' }];
  await runPollSubstack({ fetchConfig: fetcher({ archive }), ...mem, ...push(), now: () => NOW_RECENT });
  assert.equal(mem.list()[0].audience, 'paid');
  assert.equal(mem.body('222067800'), undefined);
  assert.ok(![...mem.data.keys()].some((key) => key.startsWith(`${SUBSTACK_BODIES_STORE}/`)));
});

test('free -> paid flip deletes the stored body', async () => {
  const mem = memory();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...push(), now: () => NOW_RECENT });
  assert.ok(mem.body('222067800'));
  await runPollSubstack({ fetchConfig: fetcher({ archive: [{ ...REAL, audience: 'founding' }] }), ...mem, ...push(), now: () => NOW_RECENT });
  assert.equal(mem.body('222067800'), undefined);
  assert.equal(mem.list()[0].audience, 'paid');
  assert.equal(mem.list()[0].bodyHash, null);
});

test('posts that fall out of the feed/archive window stay in the list', async () => {
  const mem = memory();
  await runPollSubstack({ fetchConfig: fetcher({ archive: [extra(920, 'a', 30), REAL] }), ...mem, ...push(), now: () => NOW_RECENT });
  await runPollSubstack({ fetchConfig: fetcher({ archive: [REAL] }), ...mem, ...push(), now: () => NOW_RECENT });
  assert.deepEqual(mem.list().map((e) => e.id).sort(), ['222067800', '920']);
});

test('feed-only post (not in archive) is skipped, never written with an unknown audience', async () => {
  const mem = memory();
  const result = await runPollSubstack({ fetchConfig: fetcher({ archive: [] }), ...mem, ...push(), now: () => NOW_RECENT });
  assert.equal(result.fetched, 0);
  assert.deepEqual(mem.list(), []); // key exists (seeded) but empty
});

test('archive down: aborts, nothing written (even if the feed is fine)', async () => {
  const mem = memory();
  const errors = [];
  const orig = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  try {
    await assert.rejects(runPollSubstack({ fetchConfig: fetcher({ archiveStatus: 404 }), ...mem, ...push(), now: () => NOW_RECENT }), /archive/);
  } finally {
    console.error = orig;
  }
  assert.equal(mem.data.size, 0);
  assert.ok(errors.some((e) => /aborting, nothing written/.test(e)));
});

test('feed down: aborts, nothing written', async () => {
  const mem = memory();
  const orig = console.error;
  console.error = () => {};
  try {
    await assert.rejects(runPollSubstack({ fetchConfig: fetcher({ feedStatus: 404 }), ...mem, ...push(), now: () => NOW_RECENT }), /feed/);
  } finally {
    console.error = orig;
  }
  assert.equal(mem.data.size, 0);
});

test('list READ error is not treated as an empty store: aborts, no writes, no push', async () => {
  const mem = memory();
  const p = push();
  await assert.rejects(
    runPollSubstack({ fetchConfig: fetcher(), ...mem, getJSONFn: async () => { throw new Error('blobs read failed'); }, ...p, now: () => NOW_RECENT }),
    /blobs read failed/
  );
  assert.equal(mem.data.size, 0);
  assert.equal(p.calls.sends.length, 0);
});

test('a corrupt (non-array) stored list aborts rather than being overwritten', async () => {
  const mem = memory();
  await mem.setJSONFn(SUBSTACK_POSTS_STORE, SUBSTACK_POSTS_KEY, { oops: true });
  await assert.rejects(runPollSubstack({ fetchConfig: fetcher(), ...mem, ...push(), now: () => NOW_RECENT }), /not an array/);
});

test('body write failure holds the post out of the list (retried next run, still counts as new)', async () => {
  const mem = memory();
  let failBodies = true;
  const flaky = async (s, key, value) => {
    if (failBodies && s === SUBSTACK_BODIES_STORE) throw new Error('write failed');
    return mem.setJSONFn(s, key, value);
  };
  const orig = console.error;
  console.error = () => {};
  try {
    const first = await runPollSubstack({ fetchConfig: fetcher(), ...mem, setJSONFn: flaky, ...push(), now: () => NOW_RECENT });
    assert.equal(first.bodyFailures, 1);
  } finally {
    console.error = orig;
  }
  assert.deepEqual(mem.list(), []); // seeded, but the failed post is not listed
  failBodies = false;
  const second = await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...push(), now: () => NOW_RECENT });
  assert.equal(second.written, 1);
  assert.equal(mem.list().length, 1);
});

test('time guard defers posts not started in time', async () => {
  const mem = memory();
  let t = NOW_RECENT;
  const clock = () => { const v = t; t += 30_000; return v; }; // every call jumps 30s
  const result = await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...push(), now: clock });
  assert.equal(result.deferred, 1);
  assert.equal(result.written, 0);
});

test('dry run: reports what it would write, writes nothing, pushes nothing', async () => {
  const mem = memory();
  const p = push();
  const result = await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.equal(result.wouldWrite.length, 1);
  assert.equal(result.wouldWrite[0].id, '222067800');
  assert.equal(mem.data.size, 0);
  assert.equal(p.calls.sends.length, 0);
});

test('later poll after a long gap: the real post is not re-pushed', async () => {
  const mem = memory();
  const p = push();
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_RECENT });
  await runPollSubstack({ fetchConfig: fetcher(), ...mem, ...p, now: () => NOW_LATER });
  assert.equal(p.calls.sends.length, 0);
});
