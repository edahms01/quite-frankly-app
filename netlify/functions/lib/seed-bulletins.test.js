// Unit test for scripts/seed-bulletins.mjs's parseMonthlyArchiveLinks --
// placed here (not next to the script) since package.json's test script
// only scans netlify/functions/lib, same convention get-blog-posts.test.js
// already established for a top-level file's tests.
//
// Regression coverage: a live dry-run against the real archive page
// (2026-09-28) found href attributes with un-decoded `&amp;` in their
// query string (the November/October 2024 links carry ss_campaign_id/
// ss_email_id/etc. tracking params) -- the first version of this parser
// only decoded the visible link text, not the href itself, which would
// have written a malformed URL (literal "&amp;" instead of "&") into the
// bulletins Sheet tab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMonthlyArchiveLinks } from '../../../scripts/seed-bulletins.mjs';

function wrapArchiveHtml(linksHtml) {
  return `<h2><strong>The Monthly Archive</strong></h2><p>${linksHtml}</p><h2>Exclusives</h2>`;
}

test('parseMonthlyArchiveLinks: decodes &amp; in both the link text and the href query string', () => {
  const html = wrapArchiveHtml(
    '<a href="https://www.quitefrankly.tv/campaigns/view-email/abc?ss_source=x&amp;ss_campaign_id=y" target="_blank">November 4, 2024</a>'
  );
  const [bulletin] = parseMonthlyArchiveLinks(html);
  assert.equal(bulletin.url, 'https://www.quitefrankly.tv/campaigns/view-email/abc?ss_source=x&ss_campaign_id=y');
  assert.ok(!bulletin.url.includes('&amp;'), 'the href must not carry a literal &amp; into the stored url');
});

test('parseMonthlyArchiveLinks: relative hrefs are resolved against SITE_BASE_URL', () => {
  const html = wrapArchiveHtml('<a href="/campaigns/view-campaign/xyz" target="_blank">May 9, 2025 </a>');
  const [bulletin] = parseMonthlyArchiveLinks(html);
  assert.equal(bulletin.url, 'https://www.quitefrankly.tv/campaigns/view-campaign/xyz');
});

test('parseMonthlyArchiveLinks: id is YYYY-MM, title is "<Month> <Year> Bulletin"', () => {
  const html = wrapArchiveHtml('<a href="https://x" target="_blank">August 5, 2024</a>');
  const [bulletin] = parseMonthlyArchiveLinks(html);
  assert.equal(bulletin.id, '2024-08');
  assert.equal(bulletin.title, 'August 2024 Bulletin');
  assert.equal(bulletin.publishedAt, new Date(Date.UTC(2024, 7, 5)).toISOString());
});

test('parseMonthlyArchiveLinks: multiple pipe-separated links all parse, in document order', () => {
  const html = wrapArchiveHtml(
    '<a href="https://x/a" target="_blank">July 7, 2025</a> | <a href="https://x/b" target="_blank">June 2, 2025</a>'
  );
  const bulletins = parseMonthlyArchiveLinks(html);
  assert.deepEqual(bulletins.map((b) => b.id), ['2025-07', '2025-06']);
});

test('parseMonthlyArchiveLinks: missing "The Monthly Archive" heading throws instead of silently returning nothing', () => {
  assert.throws(() => parseMonthlyArchiveLinks('<h2>Exclusives</h2><p><a href="https://x">not a date</a></p>'), /Could not find "The Monthly Archive"/);
});

test('parseMonthlyArchiveLinks: unparseable date text throws with the offending text', () => {
  const html = wrapArchiveHtml('<a href="https://x" target="_blank">not a real date</a>');
  assert.throws(() => parseMonthlyArchiveLinks(html), /Could not parse a date from Monthly Archive link text "not a real date"/);
});
