import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRequest, isChatPage, isOrigin, linkInjection, parsePageMessage } from './askfrankieNav.js';

const O = 'https://askfrankie.netlify.app';

test('origin match has a boundary: look-alike hosts never match', () => {
  assert.equal(isOrigin(`${O}/`, O), true);
  assert.equal(isOrigin(`${O}?app=1`, O), true);
  assert.equal(isOrigin(O, O), true);
  for (const bad of ['https://askfrankie.netlify.app.evil.com/', 'https://askfrankie.netlify.appx', 'http://askfrankie.netlify.app/', 'https://evil.com/?https://askfrankie.netlify.app', '', null, undefined]) assert.equal(isOrigin(bad, O), false, String(bad));
});

test('only the chat page loads inside the WebView; Terms/Privacy and every other web page open outside; mailto/tel go to the OS; the rest is blocked', () => {
  for (const u of [`${O}/?app=1`, `${O}/`, `${O}/index.html?app=1#x`, 'about:blank']) assert.equal(classifyRequest(u, O), 'stay', u);
  for (const u of [`${O}/terms.html`, `${O}/privacy.html`, 'https://www.youtube.com/watch?v=1', 'https://askfrankie.netlify.app.evil.com/', 'http://example.com']) assert.equal(classifyRequest(u, O), 'external', u);
  for (const u of ['mailto:hello@dahms.io', 'tel:+4400000']) assert.equal(classifyRequest(u, O), 'system', u);
  for (const u of ['javascript:alert(1)', 'intent://x#Intent;end', 'file:///etc/passwd', 'quitefrankly://x', 'data:text/html,hi', '', null]) assert.equal(classifyRequest(u, O), 'block', String(u));
  assert.equal(isChatPage(`${O}/archive.js`, O), false);
});

test('page messages: accepted only from the chat origin, only the three fixed shapes', () => {
  assert.deepEqual(parsePageMessage('{"type":"ready","signedIn":true}', `${O}/?app=1`, O), { type: 'ready', signedIn: true });
  assert.deepEqual(parsePageMessage('{"type":"ready","signedIn":"yes"}', `${O}/`, O), { type: 'ready', signedIn: false });
  assert.deepEqual(parsePageMessage('{"type":"deleted","extra":1}', `${O}/`, O), { type: 'deleted' });
  assert.deepEqual(parsePageMessage('{"type":"signedOut"}', `${O}/`, O), { type: 'signedOut' });
  assert.equal(parsePageMessage('{"type":"ready"}', 'https://evil.com/', O), null);
  assert.equal(parsePageMessage('{"type":"ready"}', undefined, O), null);
  for (const bad of ['', 'junk', '[]', '5', '{"type":"other"}', `{"type":"ready","pad":"${'x'.repeat(300)}"}`, null]) assert.equal(parsePageMessage(bad, `${O}/`, O), null, String(bad).slice(0, 30));
});

test('injected script is one dispatchEvent call; hostile characters in the detail stay inside the JSON string', () => {
  const js = linkInjection({ type: 'link', token: 'a.b.c', email: 'x"});alert(1);//@y.co</script>\u2028' });
  assert.ok(js.startsWith("window.dispatchEvent(new CustomEvent('qf-link',{detail:"));
  assert.ok(js.endsWith('}));true;'));
  assert.equal(js.includes('</script>'), false);
  assert.equal(js.includes('\u2028'), false);
  const m = /detail:(.*)\}\)\);true;$/s.exec(js);
  assert.deepEqual(JSON.parse(m[1]), { type: 'link', token: 'a.b.c', email: 'x"});alert(1);//@y.co</script>\u2028' });
});
