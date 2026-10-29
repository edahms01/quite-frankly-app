import test from 'node:test';
import assert from 'node:assert/strict';
import { scanBundle, scanText, splitModules } from './bundleScan.mjs';

const mod = (body) => `__d(function(g,r,i,a,m,e,d){${body}},1,[]);`;

test('clean modules pass; the Home website link and shop / embed hosts are not violations', () => {
  const bundle = [mod('var a="https://quitefrankly.tv";'), mod('var b="https://docs.google.com/spreadsheets/d/e/x/pub?output=csv";var c="https://open.spotify.com/embed";var d="https://amazon.com/shop/x"')].join('\n');
  assert.deepEqual(scanBundle(bundle).hits, []);
});

test('each kind of violation is caught', () => {
  const cases = [
    ['host', 'var u="https://www.patreon.com/quitefrankly";'],
    ['host', 'var u="paypal.me/QuiteFranklyLive";'],
    ['path', 'var u="https://www.quitefrankly.tv/sponsor";'],
    ['phrase', 'var t="Become a Patron";'],
    ['removed-screen', 'var t="Support the Show";'],
    ['removed-screen', 'var t="Subscribe to Read";'],
    ['removed-screen', 'var t="Culture Club";'],
    ['crypto', 'var a="bc1q97w5ahf8r0xj3ylnl9wnqxs8jqkm9w0j2z7h9a";'],
    ['crypto', 'var a="0x32Be343B94f860124dC4fEe278FDCBD38C102D88";'],
  ];
  for (const [kind, body] of cases) assert.ok(scanBundle(mod(body)).hits.some((h) => h.kind === kind), `${kind}: ${body}`);
});

test('the deny-list config module is skipped by its export name; a copy of the strings in any other module is not', () => {
  const cfg = mod('Object.defineProperty(e,"PAYMENT_HOSTS",{get:function(){return h}});var h=["patreon.com","paypal.com"];');
  assert.deepEqual(scanBundle([cfg, mod('var ok=1;')].join('\n')).hits, []);
  assert.equal(scanBundle([cfg, mod('var u="https://patreon.com/x"')].join('\n')).hits.length > 0, true);
});

test('allowlist accepts an exact kind + match and reports the reason', () => {
  const r = scanBundle(mod('var u="https://ko-fi.com/x";'), [{ kind: 'host', match: 'ko-fi.com', reason: 'test' }]);
  assert.equal(r.hits.length, 0);
  assert.equal(r.allowed[0].reason, 'test');
});

test('look-alike hosts do not match', () => {
  assert.deepEqual(scanText('https://notstripe.com/x https://mywise.company/y'), []);
});

test('splitModules splits on __d( at line start', () => {
  assert.equal(splitModules('a\n__d(1)\n__d(2)').length, 3);
});
