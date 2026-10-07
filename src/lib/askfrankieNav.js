// Pure helpers for the AskFrankie WebView (no React, no native modules) so they can be tested with node --test.

/** Does `url` belong to `origin` (scheme + host + port)? A prefix test with a boundary, so "https://askfrankie.netlify.app.evil.com" never matches. */
export function isOrigin(url, origin) {
  if (typeof url !== 'string' || !origin) return false;
  if (!url.startsWith(origin)) return false;
  const next = url.charAt(origin.length);
  return next === '' || next === '/' || next === '?' || next === '#';
}

/** The chat page itself: "/", "/index.html", with any query or hash. */
export function isChatPage(url, origin) {
  if (!isOrigin(url, origin)) return false;
  const path = url.slice(origin.length).replace(/[?#].*$/, '');
  return path === '' || path === '/' || path === '/index.html';
}

/**
 * What to do with a navigation the WebView is about to make:
 *   'stay'     load it in the WebView (the chat page only)
 *   'external' open it in the in-app browser sheet (any other http(s) page: Terms, Privacy, replay links, other sites)
 *   'system'   hand it to the OS (mailto:, tel:)
 *   'block'    do nothing (everything else: javascript:, intent:, file:, custom schemes, ...)
 */
export function classifyRequest(url, origin) {
  if (typeof url !== 'string') return 'block';
  if (url === 'about:blank') return 'stay';
  if (isChatPage(url, origin)) return 'stay';
  if (/^https?:\/\//i.test(url)) return 'external';
  if (/^(mailto|tel):/i.test(url)) return 'system';
  return 'block';
}

/** The JavaScript injected after load to hand the page a link token / prefill. `detail` is JSON-encoded, so nothing in it can break out of the string. */
export function linkInjection(detail) {
  const json = JSON.stringify(detail).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `window.dispatchEvent(new CustomEvent('qf-link',{detail:${json}}));true;`;
}

/** A message from the page: parsed only when it comes from the chat origin and is one of the three fixed types. */
export function parsePageMessage(data, fromUrl, origin) {
  if (!isOrigin(fromUrl, origin) || typeof data !== 'string' || data.length > 200) return null;
  let m;
  try { m = JSON.parse(data); } catch { return null; }
  if (!m || typeof m !== 'object') return null;
  if (m.type === 'ready') return { type: 'ready', signedIn: m.signedIn === true };
  if (m.type === 'deleted' || m.type === 'signedOut') return { type: m.type };
  return null;
}
