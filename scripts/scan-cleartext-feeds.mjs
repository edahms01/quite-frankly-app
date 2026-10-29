#!/usr/bin/env node
// One-off, READ-ONLY (GET only): find cleartext http:// URLs in the live feed data the app loads. Release builds block cleartext traffic, so any
// http:// that the app fetches itself (audio, images, API, CSV) must be https. Links the user taps open elsewhere (browser / Custom Tab) are reported separately.
// Usage: node scripts/scan-cleartext-feeds.mjs [--base https://quite-frankly-app.netlify.app]
const args = process.argv.slice(2);
const BASE = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'https://quite-frankly-app.netlify.app').replace(/\/$/, '');
const FN = `${BASE}/.netlify/functions`;
const get = async (u, text) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u}: ${r.status}`); return text ? r.text() : r.json(); };

async function paged(endpoint, key, pageParams) {
  const items = [];
  for (let i = 0; i < 200; i++) {
    const page = await get(`${FN}/${endpoint}?${pageParams(i, items.length)}`);
    items.push(...(page[key] ?? []));
    if (!page.hasMore || !(page[key] ?? []).length) break;
    if (page.nextCursor) { pageParams.cursor = page.nextCursor; }
  }
  return items;
}

const sources = {
  'get-youtube-episodes': await paged('get-youtube-episodes', 'episodes', (_, n) => `offset=${n}&limit=50`),
  'get-soundcloud-episodes': await paged('get-soundcloud-episodes', 'episodes', (_, n) => `offset=${n}&limit=50`),
  'get-youtube-feed': [await get(`${FN}/get-youtube-feed`)],
  'get-feature-flags': [await get(`${FN}/get-feature-flags`)],
  'get-live-status': [await get(`${FN}/get-live-status`)],
  'get-substack-posts': [await get(`${FN}/get-substack-posts`)],
  'get-blog-posts': [await get(`${FN}/get-blog-posts`)],
  'get-newsletter-items': [await get(`${FN}/get-newsletter-items`)],
};
const csv = await get('https://docs.google.com/spreadsheets/d/e/2PACX-1vTPD9jF4yGWK1nP6NTVLWieooQGpWYRO0h2RVK0zBQNIoUYDLAhUmHp7Y23I9bHjWMvvqSjxLrLQl6T/pub?gid=863514589&single=true&output=csv', true);
sources['Shop CSV'] = [{ csv }];

// fields the app loads by itself (media, images, api) vs text it only displays / opens as a link
const FETCHED = /(audio|thumbnail|image|cover|artwork|poster|src|avatar|icon|stream)/i;
const rows = [];
function walk(v, path, src) {
  if (typeof v === 'string') {
    const direct = /^http:\/\//i.test(v) || /\/http:\/\//i.test(v);
    const inHtml = /(?:src|srcset|poster|data-src)=["']http:\/\//i.test(v);
    const links = [...v.matchAll(/http:\/\/[^\s"'<>)]+/gi)].length;
    if (direct || inHtml) rows.push({ src, path, kind: inHtml ? 'html src/poster' : 'value', sample: v.slice(0, 110) });
    else if (links) rows.push({ src, path, kind: 'text link(s)', n: links, sample: (v.match(/http:\/\/[^\s"'<>)]+/i) || [''])[0].slice(0, 90) });
  } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[]', src));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, src);
}
for (const [src, data] of Object.entries(sources)) walk(data, '', src);

const group = {};
for (const r of rows) { const k = `${r.src} :: ${r.path} :: ${r.kind}`; (group[k] ??= { n: 0, links: 0, sample: r.sample }).n++; group[k].links += r.n || 0; }
console.log('items scanned:', Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, Array.isArray(v) && v.length === 1 && v[0] && typeof v[0] === 'object' ? 'doc' : v.length])));
console.log('\nhttp:// occurrences by source :: field :: kind  (count)');
for (const [k, g] of Object.entries(group).sort()) console.log(`  ${k}  x${g.n}${g.links ? ` (${g.links} links)` : ''}\n      e.g. ${g.sample}`);
const fetched = Object.entries(group).filter(([k]) => FETCHED.test(k.split(' :: ')[1]) && !k.endsWith('text link(s)'));
console.log(`\nFields the app FETCHES itself that contain http://: ${fetched.length ? fetched.map(([k]) => k).join(' | ') : 'none'}`);
