import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeDescription, findPaymentHits, containsPaymentText, paymentReason, describe as describeText } from './sanitizeDescription.js';

const fixtures = JSON.parse(readFileSync(new URL('./__fixtures__/descriptions.json', import.meta.url), 'utf8'));

test('25 real YouTube descriptions with payment text: output matches the reviewed "after", with zero residual hits', () => {
  assert.equal(fixtures.youtubeChanged.length, 25);
  for (const f of fixtures.youtubeChanged) {
    assert.ok(containsPaymentText(f.before), `${f.id}: fixture should contain payment text before`);
    const out = sanitizeDescription(f.before);
    assert.equal(out, f.after, f.id);
    assert.deepEqual(findPaymentHits(out), [], f.id);
  }
});

test('real descriptions without payment text come through unchanged apart from blank-run tidying', () => {
  for (const f of fixtures.youtubeUnchanged) {
    assert.equal(sanitizeDescription(f.before), f.before.trim().replace(/\n{3,}/g, '\n\n'), f.id);
  }
});

test('SoundCloud description and descriptionFull samples have no residual payment text', () => {
  for (const f of fixtures.soundcloud) {
    assert.equal(sanitizeDescription(f.before), f.after, f.id);
    assert.equal(sanitizeDescription(f.beforeFull), f.afterFull, f.id);
    assert.deepEqual(findPaymentHits(f.after), [], f.id);
    assert.deepEqual(findPaymentHits(f.afterFull), [], f.id);
  }
});

test('the real support block: label + link pairs, crypto heading, coin labels and addresses all go; shop and mail lines stay', () => {
  const before = [
    'Episode text.',
    '',
    'Join The Culture Club - Keep Quite Frankly Independent:',
    'https://www.quitefrankly.tv/sponsor',
    '',
    'One-Time Tip:',
    'https://www.paypal.me/QuiteFranklyLive',
    '',
    "Frank's Amazon Essentials:",
    'https://amazon.com/shop/quitefranklyofficial',
    '',
    'SEND FRANK MAIL',
    'Rye, NY 10580',
    '',
    'TIP IN CRYPTO',
    '',
    'BTC:',
    'bc1q97w5ahf8r0xj3ylnl9wnqxs8jqkm9w0j2z7h9a',
    '',
    'XRP:',
    'rnES2vJvxoTnVyT2Wkn9FZw3rTcjgmj1V1',
    '',
    'SOCIALS',
  ].join('\n');
  assert.equal(
    sanitizeDescription(before),
    ["Episode text.", '', "Frank's Amazon Essentials:", 'https://amazon.com/shop/quitefranklyofficial', '', 'SEND FRANK MAIL', 'Rye, NY 10580', '', 'SOCIALS'].join('\n')
  );
});

test('one rule at a time', () => {
  const gone = [
    'https://www.patreon.com/quitefrankly', 'Support us on PayPal.me/frank', 'https://ko-fi.com/x', 'buymeacoffee.com/x', 'https://www.subscribestar.com/qf',
    'venmo.com/u/frank', 'cash.app/$frank', 'https://gofundme.com/f/x', 'https://buy.stripe.com/abc', 'https://revolut.me/frank', 'monzo.me/frank',
    'https://wise.com/pay/me/x', 'https://quitefrankly.tv/sponsor', 'http://www.quitefrankly.tv/Sponsor?x=1', 'https://quitefranklyofficial.substack.com/subscribe',
    'Become a Patron today', 'Join the Culture Club', 'Super Chat to be read', 'Please donate', 'Support the Show', 'One-Time Tip',
    'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', '0x32Be343B94f860124dC4fEe278FDCBD38C102D88',
    'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh', 'DRapidDiBYggT1kBbCeYyAhEiDJS1d1AQ5',
  ];
  for (const line of gone) assert.equal(sanitizeDescription(`keep me\n${line}\nand me`), 'keep me\nand me', line);
});

test('look-alikes stay', () => {
  const keep = [
    'Cryptozoologist Adam Davies joins us', 'https://notstripe.com', 'quitefrankly.tv/mailing-list-sign-up', 'https://www.quitefrankly.tv', 'Substack: https://substack.com/@quitefranklyofficial',
    'The robot asking for a tip', '#InternetCulture #CultureWars', 'https://amazon.com/shop/quitefranklyofficial', 'https://tinyurl.com/f3kbkr4s',
  ];
  for (const line of keep) assert.equal(sanitizeDescription(line), line, line);
});

test('label directly above a removed line is dropped; a label above a kept line is not', () => {
  assert.equal(sanitizeDescription('Hello\nOfficial Merch:\nhttps://tinyurl.com/x\nOne-Time Tip:\nhttps://paypal.me/q'), 'Hello\nOfficial Merch:\nhttps://tinyurl.com/x');
});

test('empty, blank, non-string and fully-stripped input give an empty string', () => {
  for (const v of [undefined, null, '', '   \n\n ', 42, {}]) assert.equal(sanitizeDescription(v), '');
  assert.equal(sanitizeDescription('Join The Culture Club:\nhttps://www.quitefrankly.tv/sponsor\n\nOne-Time Tip:\nhttps://www.paypal.me/q'), '');
  assert.equal(paymentReason(undefined), null);
});

test('collapses blank runs and trims; handles CRLF', () => {
  assert.equal(sanitizeDescription('a\r\n\r\n\r\n\r\nb  \r\n\r\n'), 'a\n\nb');
});

test('describe(): preview and "Show more" are recomputed from the sanitized text', () => {
  const lines = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`);
  // 12 lines but 3 are payment lines: 9 left = no "Show more"
  const withPay = [...lines.slice(0, 9), 'https://paypal.me/x', 'Become a Patron', 'donate', ...[]].join('\n');
  const d = describeText(withPay, 10);
  assert.equal(d.isLong, false);
  assert.equal(d.full.split('\n').length, 9);
  const long = describeText(lines.join('\n'), 10);
  assert.equal(long.isLong, true);
  assert.equal(long.preview.split('\n').length, 10);
  // payment lines inside the first 10 do not eat preview slots
  const mixed = describeText(['https://paypal.me/x', ...lines].join('\n'), 10);
  assert.equal(mixed.preview.split('\n')[0], 'line 1');
  assert.equal(mixed.preview.split('\n').length, 10);
  const empty = describeText('One-Time Tip:\nhttps://paypal.me/x', 10);
  assert.equal(empty.isEmpty, true);
  assert.equal(empty.isLong, false);
});

test('a long prose line loses only the offending sentence, not the whole episode summary', () => {
  const prose = 'John Leake joins Frank to discuss his book about irrational obsessions and the ways crowds go wrong in public life. Join the Culture Club to hear the rest. We also take calls.';
  assert.equal(sanitizeDescription(prose), 'John Leake joins Frank to discuss his book about irrational obsessions and the ways crowds go wrong in public life. We also take calls.');
  // a single long sentence that matches is dropped whole (no safe way to cut it)
  assert.equal(sanitizeDescription(`${'word '.repeat(40)}please donate now`), '');
  // short lines stay all-or-nothing
  assert.equal(sanitizeDescription('Please donate. Thanks.'), '');
});
