// Unit tests for lib/substack.js: mapping against the REAL captured feed +
// archive fixtures (2026-10-27), the body cleaner, hash/merge planning and
// the push-selection rule. No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseFeed,
  joinFeedAndArchive,
  cleanSubstackHtml,
  resolveAuthor,
  isPaidAudience,
  slugFromUrl,
  planPost,
  toListEntry,
  mergeById,
  selectPushPosts,
  AUTHOR_FALLBACK,
} from './substack.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const FEED_XML = readFileSync(join(dir, 'substack-feed.xml'), 'utf8');
const ARCHIVE = JSON.parse(readFileSync(join(dir, 'substack-archive.json'), 'utf8'));

const count = (html, re) => (html.match(re) || []).length;
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&(\w+);/g, (m, n) => NAMED[n] ?? m);
const visibleText = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// ---- feed + archive mapping (real fixture) ----

test('parseFeed: real feed -> one item with the documented fields', () => {
  const items = parseFeed(FEED_XML);
  assert.equal(items.length, 1);
  const [item] = items;
  assert.equal(item.slug, 'when-lightning-strikes-you-catch');
  assert.equal(item.title, 'When Lightning Strikes, You Catch It');
  assert.equal(item.blurb, 'A Year of Tiny Breakthroughs');
  assert.equal(item.creator, 'Frank | Quite Frankly');
  assert.equal(item.publishedAt, '2026-10-26T13:49:18.000Z');
  assert.match(item.heroImageUrl, /cca7b4b1-e518-4460-87e0-8030e4131b89_912x513\.jpeg$/);
  assert.ok(item.contentHtml.length > 50_000);
});

test('joinFeedAndArchive: real fixtures -> one free record with a cleaned body', () => {
  const { records, skippedFeedOnly } = joinFeedAndArchive(parseFeed(FEED_XML), ARCHIVE);
  assert.equal(skippedFeedOnly.length, 0);
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.id, '222067800'); // archive id, not the feed guid
  assert.equal(r.audience, 'free');
  assert.equal(r.title, 'When Lightning Strikes, You Catch It');
  assert.equal(r.blurb, 'A Year of Tiny Breakthroughs');
  assert.equal(r.url, 'https://quitefranklyofficial.substack.com/p/when-lightning-strikes-you-catch');
  assert.equal(r.publishedAt, '2026-10-26T13:49:18.786Z'); // archive post_date wins
  assert.equal(r.author, 'Quite Frankly');
  assert.ok(r.readMinutes >= 1);
  assert.equal(typeof r.bodyHtml, 'string');
  assert.equal(count(r.bodyHtml, /<img\b/g), 10);
});

test('joinFeedAndArchive: a feed post missing from the archive is skipped, not written', () => {
  const { records, skippedFeedOnly } = joinFeedAndArchive(parseFeed(FEED_XML), []);
  assert.equal(records.length, 0);
  assert.equal(skippedFeedOnly.length, 1);
});

test('joinFeedAndArchive: paid post (only_paid and founding) -> no body, even if the feed carries text', () => {
  for (const audience of ['only_paid', 'founding']) {
    const archive = [{ ...ARCHIVE[0], audience }];
    const { records } = joinFeedAndArchive(parseFeed(FEED_XML), archive);
    assert.equal(records[0].audience, 'paid');
    assert.equal('bodyHtml' in records[0], false);
    assert.equal(records[0].blurb, 'A Year of Tiny Breakthroughs');
  }
});

test('joinFeedAndArchive: archive-only free post (outside the feed window) -> free, no body, readMinutes from wordcount', () => {
  const { records } = joinFeedAndArchive([], [{ ...ARCHIVE[0], wordcount: 1083 }]);
  assert.equal(records[0].audience, 'free');
  assert.equal('bodyHtml' in records[0], false);
  assert.equal(records[0].readMinutes, 6);
});

test('joinFeedAndArchive: cover image falls back to the feed enclosure; unusable archive rows are ignored', () => {
  const archive = [{ ...ARCHIVE[0], cover_image: null }, { id: null, slug: 'x', title: 'bad' }, { id: 5, slug: '', title: 'bad' }];
  const { records } = joinFeedAndArchive(parseFeed(FEED_XML), archive);
  assert.equal(records.length, 1);
  assert.match(records[0].heroImageUrl, /cca7b4b1/);
});

test('isPaidAudience: only "everyone" is free', () => {
  assert.equal(isPaidAudience('everyone'), false);
  for (const a of ['only_paid', 'founding', 'something_new', undefined]) assert.equal(isPaidAudience(a), true);
});

test('slugFromUrl', () => {
  assert.equal(slugFromUrl('https://x.substack.com/p/a-b-c?utm_source=x'), 'a-b-c');
  assert.equal(slugFromUrl('https://x.substack.com/about'), '');
  assert.equal(slugFromUrl(undefined), '');
});

// ---- author byline ----

test('resolveAuthor: creator containing "Quite Frankly" -> "Quite Frankly"', () => {
  assert.equal(resolveAuthor('Frank | Quite Frankly'), 'Quite Frankly');
  assert.equal(resolveAuthor('quite frankly'), 'Quite Frankly');
});

test('resolveAuthor: other creator shown as given (trimmed)', () => {
  assert.equal(resolveAuthor('  Guest Writer '), 'Guest Writer');
});

test('resolveAuthor: missing/blank -> fallback', () => {
  for (const v of [undefined, null, '', '   ', 42]) assert.equal(resolveAuthor(v), AUTHOR_FALLBACK);
});

test('joinFeedAndArchive: a different creator in the feed is shown as is; no feed item uses the archive byline', () => {
  const guest = parseFeed(FEED_XML.replace('<![CDATA[Frank | Quite Frankly]]></dc:creator>', '<![CDATA[Guest Writer]]></dc:creator>'));
  assert.equal(joinFeedAndArchive(guest, ARCHIVE).records[0].author, 'Guest Writer');
  const archive = [{ ...ARCHIVE[0], publishedBylines: [{ name: 'Someone Else' }] }];
  assert.equal(joinFeedAndArchive([], archive).records[0].author, 'Someone Else');
  assert.equal(joinFeedAndArchive([], [{ ...ARCHIVE[0], publishedBylines: [] }]).records[0].author, AUTHOR_FALLBACK);
});

// ---- body cleaner ----

test('cleanSubstackHtml (real body): widgets/buttons/svg/forms stripped, text and images kept', () => {
  const raw = parseFeed(FEED_XML)[0].contentHtml;
  const before = { img: count(raw, /<img\b/g), a: count(raw, /<a\b/g), button: count(raw, /<button\b/g), form: count(raw, /<form\b/g), widget: count(raw, /subscription-widget-wrap-editor/g) };
  const cleaned = cleanSubstackHtml(raw);
  const after = { img: count(cleaned, /<img\b/g), a: count(cleaned, /<a\b/g), button: count(cleaned, /<button\b/g), form: count(cleaned, /<form\b/g), widget: count(cleaned, /subscription-widget/g) };
  console.log('cleaner before/after (real post):', JSON.stringify({ before, after }));
  assert.deepEqual(before, { img: 10, a: 8, button: 16, form: 2, widget: 2 });
  assert.deepEqual(after, { img: 10, a: 0, button: 0, form: 0, widget: 0 });
  assert.ok(!/reader-supported publication/.test(cleaned));
  assert.ok(!/Type your email/.test(cleaned));
  assert.match(cleaned, /J Gulinello and Jim Lee/); // @mention name recovered from data-attrs
});

test('cleanSubstackHtml (real body): all article prose is kept, only the two widget captions go', () => {
  const raw = parseFeed(FEED_XML)[0].contentHtml;
  const caption = 'Frank is a reader-supported publication. To receive new posts and support my work, consider becoming a free or paid subscriber.';
  const cleaned = cleanSubstackHtml(raw);
  const rawText = visibleText(raw);
  const cleanText = visibleText(cleaned);
  // Every prose sentence outside the widget survives (compare after removing the caption and the mention name).
  const expectedText = rawText.split(caption).join(' ').replace(/\s+/g, ' ').trim();
  const withoutMentions = cleanText.replace(/J Gulinello|The ClimateViewer Report/g, '').replace(/\s+/g, ' ').trim();
  assert.equal(withoutMentions, expectedText);
  assert.match(cleanText, /Jim Lee, The ClimateViewer Report, suggested/);
});

test('cleanSubstackHtml: html with no Substack markup is returned unchanged (same string)', () => {
  const plain = '<p>Hello <strong>world</strong> &amp; <a href="https://example.com">link</a></p><ul><li>one</li></ul>';
  assert.equal(cleanSubstackHtml(plain), plain);
});

test('cleanSubstackHtml: unknown markup is a no-op, never an error', () => {
  const odd = '<div class="totally-new-widget" data-foo="1"><p>Keep me</p><custom-tag>x</custom-tag></div><p class="button-wrapper-ish">kept: not an exact class match</p>';
  assert.equal(cleanSubstackHtml(odd), odd);
});

test('cleanSubstackHtml: button-wrapper / share / footer guesses are stripped when present, rest kept', () => {
  const html = '<p>Intro</p><p class="button-wrapper" data-attrs="{}"><a class="button primary" href="https://x">Share</a></p><div class="post-ufi"><button>Like</button></div><footer>foot</footer><p>Outro</p>';
  const out = cleanSubstackHtml(html);
  assert.ok(out.includes('<p>Intro</p>') && out.includes('<p>Outro</p>'));
  assert.ok(!/Share|Like|foot/.test(out));
});

test('cleanSubstackHtml: bad @mention data-attrs is dropped quietly; empty/non-string inputs are safe', () => {
  assert.equal(cleanSubstackHtml('<p>a <span class="mention-wrap" data-attrs="{not json"></span> b</p>'), '<p>a  b</p>');
  assert.equal(cleanSubstackHtml(''), '');
  assert.equal(cleanSubstackHtml(undefined), '');
  assert.equal(cleanSubstackHtml(null), '');
});

test('cleanSubstackHtml: a link in the text (not an image wrapper) survives', () => {
  const html = '<p>See <a href="https://example.com/x">this</a></p><div class="subscription-widget-wrap-editor"><p>junk</p></div>';
  const out = cleanSubstackHtml(html);
  assert.ok(out.includes('<a href="https://example.com/x">this</a>'));
  assert.ok(!out.includes('junk'));
});

// ---- hash/skip, edit detection, merge ----

const REC = {
  id: '1', title: 'T', blurb: 'B', url: 'https://x/p/t', publishedAt: '2026-10-26T00:00:00.000Z',
  heroImageUrl: 'h', author: 'Quite Frankly', readMinutes: 3, audience: 'free', bodyHtml: '<p>body</p>',
};
const entryFor = (rec, existing) => toListEntry(rec, planPost(rec, existing));

test('planPost: no stored entry -> new, changed', () => {
  const p = planPost(REC, undefined);
  assert.equal(p.isNew, true);
  assert.equal(p.changed, true);
  assert.equal(p.bodyChanged, true);
});

test('planPost: identical record -> unchanged (skipped)', () => {
  const p = planPost(REC, entryFor(REC));
  assert.equal(p.changed, false);
});

test('planPost: edited body is caught', () => {
  const p = planPost({ ...REC, bodyHtml: '<p>body v2</p>' }, entryFor(REC));
  assert.equal(p.changed, true);
  assert.equal(p.bodyChanged, true);
  assert.equal(p.metaChanged, false);
});

test('planPost: edited title/blurb is caught without rewriting the body', () => {
  const p = planPost({ ...REC, title: 'T2' }, entryFor(REC));
  assert.equal(p.changed, true);
  assert.equal(p.metaChanged, true);
  assert.equal(p.bodyChanged, false);
});

test('planPost: free post that left the feed window keeps its stored body hash and is unchanged', () => {
  const stored = entryFor(REC);
  const { bodyHtml, ...noBody } = REC; // same meta, no body this run
  const p = planPost(noBody, stored);
  assert.equal(p.changed, false);
  assert.equal(p.bodyHash, stored.bodyHash);
});

test('planPost: free -> paid drops the stored body', () => {
  const { bodyHtml, ...paid } = { ...REC, audience: 'paid' };
  const p = planPost(paid, entryFor(REC));
  assert.equal(p.dropBody, true);
  assert.equal(p.changed, true);
  assert.equal(p.bodyHash, null);
});

test('toListEntry: never carries bodyHtml', () => {
  const e = entryFor(REC);
  assert.equal('bodyHtml' in e, false);
  assert.equal(e.id, '1');
});

test('mergeById: incoming wins, posts that fell out of the window stay, newest first', () => {
  const old = { id: 'a', publishedAt: '2026-01-01T00:00:00.000Z', title: 'old' };
  const mid = { id: 'b', publishedAt: '2026-05-01T00:00:00.000Z', title: 'mid' };
  const merged = mergeById([old, mid], [{ id: 'b', publishedAt: '2026-05-01T00:00:00.000Z', title: 'mid edited' }, { id: 'c', publishedAt: '2026-09-01T00:00:00.000Z', title: 'new' }]);
  assert.deepEqual(merged.map((e) => e.id), ['c', 'b', 'a']);
  assert.equal(merged[1].title, 'mid edited');
});

test('mergeById: empty/undefined existing', () => {
  assert.deepEqual(mergeById(undefined, []), []);
  assert.equal(mergeById(null, [{ id: 'z', publishedAt: '2026-01-01T00:00:00.000Z' }]).length, 1);
});

// ---- push rule ----

const NOW = Date.parse('2026-10-27T12:00:00.000Z');
const HOUR = 3600_000;
const post = (id, hoursAgo) => ({ id, title: id, publishedAt: new Date(NOW - hoursAgo * HOUR).toISOString() });

test('selectPushPosts: seed run -> never', () => {
  assert.deepEqual(selectPushPosts([post('a', 1)], { isSeed: true, now: NOW }), []);
});

test('selectPushPosts: new + recent -> push; new but older than 48h -> no push', () => {
  assert.deepEqual(selectPushPosts([post('a', 1)], { isSeed: false, now: NOW }).map((p) => p.id), ['a']);
  assert.deepEqual(selectPushPosts([post('old', 49)], { isSeed: false, now: NOW }), []);
  assert.deepEqual(selectPushPosts([post('edge', 48)], { isSeed: false, now: NOW }).map((p) => p.id), ['edge']);
});

test('selectPushPosts: capped at 3 (newest kept), sent oldest-first', () => {
  const posts = [post('p1', 5), post('p2', 4), post('p3', 3), post('p4', 2), post('p5', 1)];
  assert.deepEqual(selectPushPosts(posts, { isSeed: false, now: NOW }).map((p) => p.id), ['p3', 'p4', 'p5']);
});

test('selectPushPosts: bad dates and no posts are ignored', () => {
  assert.deepEqual(selectPushPosts([{ id: 'x', publishedAt: '' }], { isSeed: false, now: NOW }), []);
  assert.deepEqual(selectPushPosts([], { isSeed: false, now: NOW }), []);
});
