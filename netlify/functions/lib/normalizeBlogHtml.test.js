import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBlogHtml } from './normalizeBlogHtml.js';

test('copies data-src to src on <img>, leaving other attributes intact', () => {
  const input = '<p>hi</p><img class="lazy" data-src="https://example.com/a.jpg" src="placeholder.gif">';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.match(html, /<img[^>]*class="lazy"/);
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

test('is idempotent-ish: normalizing already-normalized html is a no-op', () => {
  const input = '<p>Hello <a href="https://example.com/v">Watch video</a> world</p>';
  const { html, videoEmbedCount } = normalizeBlogHtml(input);
  assert.equal(html, input);
  assert.equal(videoEmbedCount, 0);
});
