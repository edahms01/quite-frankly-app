// Home's cards: one list, one render path, the agreed order. Home.js imports native modules, so this reads its source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeDestinations, normalizeFlags } from './featureFlags.js';

const src = readFileSync(new URL('../screens/home/Home.js', import.meta.url), 'utf8');
const listText = src.slice(src.indexOf('const DESTINATIONS = ['), src.indexOf('];', src.indexOf('const DESTINATIONS = [')));
const ENTRIES = [...listText.matchAll(/\{\s*label: '([^']+)'[^}]*\}/g)].map((m) => {
  const flag = /flag: '([^']+)'/.exec(m[0]);
  const route = /route: '([^']+)'/.exec(m[0]);
  return { label: m[1], route: route && route[1], flag: flag && flag[1] };
});
const labels = (flags) => homeDestinations(ENTRIES.map((e) => ({ ...e, flag: e.flag || undefined })), normalizeFlags(flags)).map((e) => e.label);

test('Home list: agreed order, 10 cards (Culture Club removed for the first release)', () => {
  assert.deepEqual(ENTRIES.map((e) => e.label),
    ['Watch', 'Listen', 'Read', 'Shop', 'Connect', 'Ask', 'Jam', 'Play', 'Call', 'Schedule']);
});

test('Home cards: the 10 even-grid cards, no Culture Club card whatever the flags say', () => {
  assert.deepEqual(labels({}), ['Watch', 'Listen', 'Read', 'Shop', 'Connect', 'Ask', 'Jam', 'Play', 'Call', 'Schedule']);
  assert.equal(labels({}).length, 10);
  assert.deepEqual(labels({ cultureClub: true }), labels({}));
  assert.deepEqual(labels({ askfrankie_enabled: true }), labels({}));   // askfrankie_enabled changes the Ask card, not the list
});

test('Home routes keep their old internal names; Schedule is not flag-gated', () => {
  const by = Object.fromEntries(ENTRIES.map((e) => [e.label, e]));
  assert.equal(by.Read.route, 'Writing');
  assert.equal(by.Connect.route, 'Community');
  assert.equal(by.Jam.route, 'Music');
  assert.equal(by.Play.route, 'Games');
  assert.equal(by.Call.route, 'PhoneLines');
  assert.equal(by.Schedule.route, 'Calendar');
  assert.equal(by.Schedule.flag, null);
  assert.equal(by['Culture Club'], undefined);
});

test('every Home card renders from the one list: a single DestinationCard in Home.js, no special-case branches', () => {
  assert.equal((src.match(/<DestinationCard\b/g) || []).length, 1);
  assert.equal((src.match(/homeDestinations\(DESTINATIONS/g) || []).length, 1);
  assert.ok(!/askFrankie\b/.test(src.replace(/AskFrankie/g, '')), 'no askFrankie special-case flag on list entries');
});

test('the Ask card: live only with askfrankie_enabled; "Coming Soon" and the compact padding only while it is off', () => {
  const ask = /\{ label: 'Ask'[^}]*\}/.exec(src)[0];
  assert.match(ask, /route: 'AskFrankie'/);
  assert.match(ask, /enabledBy: 'askfrankie_enabled'/);
  assert.match(ask, /subtext: 'Coming Soon'/);
  assert.match(src, /subtext=\{live \? undefined : d\.subtext\}/);
  assert.match(src, /style=\{live \? undefined : styles\.comingSoonCard\}/);
});

test('the visible screen titles', () => {
  const title = (f) => /BackHeader[^>]*title="([^"]+)"/.exec(readFileSync(new URL(`../screens/${f}`, import.meta.url), 'utf8'))[1];
  assert.equal(title('home/Writing.js'), 'Read');
  assert.equal(title('home/Community.js'), 'Connect');
  assert.equal(title('home/Music.js'), 'Jam');
  assert.equal(title('games/Games.js'), 'Play');
  assert.equal(title('home/PhoneLines.js'), 'Call');
  assert.equal(title('home/Calendar.js'), 'Schedule');
  assert.equal(title('home/AskFrankie.js'), 'AskFrankie AI');   // the page keeps its name
});

test('Community > Follow Frank: Substack is the first of 6 cards', () => {
  const text = readFileSync(new URL('../screens/home/Community.js', import.meta.url), 'utf8');
  const follow = text.slice(text.indexOf('const FOLLOW = ['), text.indexOf('];', text.indexOf('const FOLLOW = [')));
  const labelsF = [...follow.matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
  assert.equal(labelsF.length, 6);
  assert.equal(labelsF[0], 'Substack');
  assert.match(follow, /label: 'Substack', Icon: Newspaper, url: 'https:\/\/quitefranklyofficial\.substack\.com'/);
});
