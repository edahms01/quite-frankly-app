import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBlogHtml } from './normalizeBlogHtml.js';

test('copies data-src to src on <img>; class is dropped by the whitelist strip (not in img\'s allowed attrs)', () => {
  const input = '<p>hi</p><img class="lazy" data-src="https://example.com/a.jpg" src="placeholder.gif">';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.doesNotMatch(html, /class="lazy"/);
  assert.match(html, /src="https:\/\/example\.com\/a\.jpg"/);
  assert.doesNotMatch(html, /placeholder\.gif/);
  assert.equal(videoEmbedCount, 0);
});

test('adds src on <img> with data-src and no existing src attribute', () => {
  const { html } = normalizeBlogHtml('<img data-src="https://example.com/b.jpg" alt="x">');
  assert.match(html, /^<img src="https:\/\/example\.com\/b\.jpg"/);
  assert.match(html, /alt="x"/);
});

test('leaves <img> without data-src untouched', () => {
  const input = '<img src="https://example.com/c.jpg" alt="x">';
  const { html } = normalizeBlogHtml(input);
  assert.equal(html, input);
});

test('rewrites protocol-relative src/href to https', () => {
  const input = '<img src="//example.com/a.jpg"><a href="//example.com/page">link</a>';
  const { html } = normalizeBlogHtml(input);
  assert.match(html, /src="https:\/\/example\.com\/a\.jpg"/);
  assert.match(html, /href="https:\/\/example\.com\/page"/);
});

test('strips <script>, <style>, and <noscript> blocks entirely', () => {
  const input = '<p>keep</p><script>evil()</script><style>.x{color:red}</style><noscript>no js</noscript><p>also keep</p>';
  const { html } = normalizeBlogHtml(input);
  assert.doesNotMatch(html, /script|style|noscript|evil\(\)|color:red/i);
  assert.match(html, /<p>keep<\/p>/);
  assert.match(html, /<p>also keep<\/p>/);
});

test('replaces a data-html video embed with a Watch video link and counts it', () => {
  const encodedIframe = '&lt;iframe src=&quot;https://www.youtube.com/embed/abc123&quot;&gt;&lt;/iframe&gt;';
  const input = `<p>before</p><div class="sqs-block-video" data-html="${encodedIframe}"></div><p>after</p>`;
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(videoEmbedCount, 1);
  assert.match(html, /<a href="https:\/\/www\.youtube\.com\/embed\/abc123">Watch video<\/a>/);
  assert.doesNotMatch(html, /sqs-block-video/);
  assert.match(html, /<p>before<\/p>/);
  assert.match(html, /<p>after<\/p>/);
});

test('drops a data-html embed with no extractable src, still counting it', () => {
  const input = '<div data-html="&lt;div&gt;no video url here&lt;/div&gt;"></div>';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(videoEmbedCount, 1);
  assert.doesNotMatch(html, /data-html/);
});

test('replaces a bare iframe embed with a Watch video link and counts it', () => {
  const input = '<p>x</p><iframe src="https://player.vimeo.com/video/999" width="640" height="360"></iframe>';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(videoEmbedCount, 1);
  assert.match(html, /<a href="https:\/\/player\.vimeo\.com\/video\/999">Watch video<\/a>/);
  assert.doesNotMatch(html, /iframe/);
});

test('drops a bare iframe with no src', () => {
  const input = '<iframe width="1" height="1"></iframe>';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(videoEmbedCount, 1);
  assert.doesNotMatch(html, /iframe/);
});

test('escapes special characters when building the Watch video link href', () => {
  const input = '<iframe src="https://example.com/v?a=1&b=2"></iframe>';
  const { html } = normalizeBlogHtml(input);
  assert.match(html, /href="https:\/\/example\.com\/v\?a=1&amp;b=2"/);
});

test('handles multiple embeds and non-embed content together', () => {
  const input = [
    '<p>Intro</p>',
    '<iframe src="https://www.youtube.com/embed/one"></iframe>',
    '<p>Middle</p>',
    '<img data-src="//img.example.com/x.png">',
    '<iframe src="https://www.youtube.com/embed/two"></iframe>',
  ].join('');
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(videoEmbedCount, 2);
  assert.match(html, /Watch video.*Watch video/s);
  assert.match(html, /src="https:\/\/img\.example\.com\/x\.png"/);
});

test('handles empty/nullish input without throwing', () => {
  assert.deepEqual(normalizeBlogHtml(''), { html: '', videoEmbedCount: 0 });
  assert.deepEqual(normalizeBlogHtml(null), { html: '', videoEmbedCount: 0 });
  assert.deepEqual(normalizeBlogHtml(undefined), { html: '', videoEmbedCount: 0 });
});

test('does not double-escape an already entity-escaped ampersand in data-src', () => {
  const input = '<img data-src="https://images.squarespace-cdn.com/x.jpg?format=1500w&amp;quality=90">';
  const { html } = normalizeBlogHtml(input);
  assert.match(html, /src="https:\/\/images\.squarespace-cdn\.com\/x\.jpg\?format=1500w&amp;quality=90"/);
  assert.doesNotMatch(html, /&amp;amp;/);
});

test('does not double-escape an already entity-escaped ampersand in a bare iframe src', () => {
  const input = '<iframe src="https://player.vimeo.com/video/999?a=1&amp;b=2"></iframe>';
  const { html } = normalizeBlogHtml(input);
  assert.match(html, /href="https:\/\/player\.vimeo\.com\/video\/999\?a=1&amp;b=2"/);
  assert.doesNotMatch(html, /&amp;amp;/);
});

test('does not double-escape an ampersand nested two levels deep inside a data-html embed', () => {
  // Real Squarespace shape: the inner <iframe src="...&amp;..."> tag is
  // itself HTML-entity-encoded a second time to live inside the outer
  // data-html attribute, so the literal ampersand is encoded twice in the
  // raw source (&amp;amp;) before any normalization touches it.
  const input =
    '<div class="sqs-block-video" data-html="&lt;iframe src=&quot;https://player.vimeo.com/video/999?a=1&amp;amp;b=2&quot;&gt;&lt;/iframe&gt;"></div>';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(videoEmbedCount, 1);
  assert.match(html, /href="https:\/\/player\.vimeo\.com\/video\/999\?a=1&amp;b=2"/);
  assert.doesNotMatch(html, /&amp;amp;/);
});

test('is idempotent-ish: normalizing already-normalized html is a no-op', () => {
  const input = '<p>Hello <a href="https://example.com/v">Watch video</a> world</p>';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(html, input);
  assert.equal(videoEmbedCount, 0);
});

// Real-world fixture: a trimmed-down version of the actual Microsoft-Word
// "paste as HTML" shape found in the live 245k-char outlier post (confirmed
// via direct blob inspection, 2026-09-28) -- an <xml> block of
// WordprocessingML style/schema data, an mso conditional-comment block, and
// an inline <o:p> paragraph marker, none of which render any visible text,
// sitting alongside genuine article prose.
test('strips Microsoft Word paste artifacts (xml/w:/m:/o: namespace elements + mso comments) while keeping real content intact', () => {
  const input = [
    '<p>Real article text starts here.</p>',
    '<xml>',
    '<w:WordDocument><w:View>Normal</w:View><w:Zoom>0</w:Zoom></w:WordDocument>',
    '<m:mathPr><m:mathFont m:val="Cambria Math"/></m:mathPr>',
    '</xml>',
    '<!--[if gte mso 9]><xml><o:OfficeDocumentSettings></o:OfficeDocumentSettings></xml><![endif]-->',
    '<p class="MsoNormal"><o:p>&nbsp;</o:p></p>',
    '<p>And it continues with more real prose after the junk.</p>',
  ].join('');
  const { html } = normalizeBlogHtml(input);
  assert.doesNotMatch(html, /w:|m:|o:|WordDocument|mathPr|OfficeDocumentSettings|MsoNormal|xml/i);
  assert.doesNotMatch(html, /<!--/);
  assert.match(html, /<p>Real article text starts here\.<\/p>/);
  assert.match(html, /<p>And it continues with more real prose after the junk\.<\/p>/);
  // The junk-only <o:p>&nbsp;</o:p> paragraph produces no real content once
  // the o:p element is dropped -- its wrapping <p class="MsoNormal"> is
  // then empty too and gets pruned rather than left as a bare stray <p></p>.
  assert.doesNotMatch(html, /<p>\s*<\/p>/);
});

test('strips class/style/id/data-* attributes from every tag, keeping only a[href] and img[src,alt,width,height]', () => {
  const input = '<p class="MsoNormal" style="margin:0" id="x" data-foo="bar">text</p><a class="link" href="https://example.com" style="color:red" data-track="1">click</a>';
  const { html } = normalizeBlogHtml(input);
  assert.equal(html, '<p>text</p><a href="https://example.com">click</a>');
});

test('unwraps non-whitelisted tags (div/span) keeping their text content', () => {
  const input = '<div class="wrapper"><span style="color:red">plain text</span></div>';
  const { html } = normalizeBlogHtml(input);
  assert.equal(html, 'plain text');
});

test('preserves table markup (tables were confirmed present in real post data)', () => {
  const input = '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>';
  const { html } = normalizeBlogHtml(input);
  assert.equal(html, input);
});

// Real-world regression (found via live-data verification, 2026-09-28,
// 17/142 real posts affected): a bare inline element whose only content is
// a non-breaking space, used as a spacer between two adjacent inline
// elements -- must NOT be pruned as "empty" (whitespace, including
// &nbsp;/U+00A0, is still real content; losing it merges two words).
test('keeps a whitespace-only (&nbsp;) inline element intact -- does not merge adjacent words', () => {
  const input = '<p>reveal <em><span style="font-size:9pt">actual</span></em><em><span style="font-size:9pt">&nbsp;</span></em><span style="font-size:11pt">fraud?</span></p>';
  const { html } = normalizeBlogHtml(input);
  assert.equal(html, '<p>reveal <em>actual</em><em>&nbsp;</em>fraud?</p>');
  assert.doesNotMatch(html, /actualfraud/);
});

test('still prunes a genuinely empty paragraph (no children at all after office-namespace content is removed)', () => {
  const input = '<p>Real article text starts here.</p><p class="MsoNormal"><o:p>&nbsp;</o:p></p><p>And more text.</p>';
  const { html } = normalizeBlogHtml(input);
  assert.equal(html, '<p>Real article text starts here.</p><p>And more text.</p>');
});
