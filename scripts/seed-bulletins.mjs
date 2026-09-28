// One-time seed of the 'bulletins' Sheet tab from quitefrankly.tv's own
// "The Monthly Archive" list (/newsletter-archives). After this runs once,
// rows are added by hand (Eric's call) -- there is no bulletin poller, and
// the app never fetches a campaign page itself, only opens `url` in the
// in-app browser.
//
// Confirmed by spike (2026-09-28): the Monthly Archive list is one <h2>
// block ("The Monthly Archive") followed by a single <p> of pipe-separated
// <a> links, each link's text a date like "July 7, 2025" and its href the
// campaign link (relative or absolute, both seen). This script parses that
// block directly rather than hardcoding the 12 links found at spike time,
// so a re-run (e.g. after Frank resumes posting bulletins) picks up new
// months without a code change -- idempotent via the same
// partitionForUpsert upsert-by-id used everywhere else in this feature.
//
// id is derived as YYYY-MM from the link's own date text (one bulletin per
// month, confirmed) -- stable, human-legible, and matches the title format
// ("July 2025 Bulletin") the brief asked for.
//
// Run with all Netlify env vars injected:
//   netlify dev:exec -- node scripts/seed-bulletins.mjs --dry-run   (read-only report, no writes)
//   netlify dev:exec -- node scripts/seed-bulletins.mjs             (live upsert)

import { appendRows, ensureBulletinsTabExists, getColumnWithRows, BULLETINS_TAB, updateRows } from '../netlify/functions/lib/sheets.js';
import { partitionForUpsert } from '../netlify/functions/lib/idempotency.js';
import { fetchWithBackoff } from '../netlify/functions/lib/fetchWithBackoff.js';
import { decodeEntities } from '../netlify/functions/lib/normalizeBlogHtml.js';
import { SITE_BASE_URL } from '../netlify/functions/lib/squarespaceNewsletter.js';

const DRY_RUN = process.argv.includes('--dry-run');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ARCHIVE_PATH = 'newsletter-archives';

async function fetchArchivePage() {
  const url = new URL(`${SITE_BASE_URL}/${ARCHIVE_PATH}`);
  url.searchParams.set('format', 'json');
  const response = await fetchWithBackoff(url.toString(), {});
  if (!response.ok) {
    throw new Error(`Fetch of "${ARCHIVE_PATH}" failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// Parses the "The Monthly Archive" heading's own <p> of pipe-separated
// links into { id, title, publishedAt, url } rows. Pure string parsing,
// no I/O -- takes the already-fetched mainContent HTML.
export function parseMonthlyArchiveLinks(mainContentHtml) {
  const headingIdx = mainContentHtml.search(/The Monthly Archive/i);
  if (headingIdx === -1) {
    throw new Error('Could not find "The Monthly Archive" heading in the archive page -- page structure may have changed.');
  }
  const afterHeading = mainContentHtml.slice(headingIdx);
  const pEnd = afterHeading.indexOf('</p>');
  if (pEnd === -1) {
    throw new Error('Could not find the closing </p> after "The Monthly Archive" heading -- page structure may have changed.');
  }
  const block = afterHeading.slice(0, pEnd);
  const linkMatches = [...block.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];

  return linkMatches.map(({ 1: rawHref, 2: rawText }) => {
    const dateText = decodeEntities(rawText).trim();
    // Parsed by hand into explicit UTC components, deliberately NOT
    // `new Date(dateText)`: that legacy free-text format parses in the
    // HOST MACHINE's local timezone, not UTC -- confirmed as a real bug
    // (this machine is Europe/London; "July 7, 2025" parsed to
    // 2025-07-06T23:00:00.000Z, the wrong calendar day, since this script
    // could run on any machine/server with any timezone, not just this
    // one). "Month D, YYYY" is the only format ever seen on this page.
    const match = dateText.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
    if (!match) {
      throw new Error(`Could not parse a date from Monthly Archive link text "${dateText}".`);
    }
    const [, monthName, dayStr, yearStr] = match;
    const monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
    if (monthIndex === -1) {
      throw new Error(`Unrecognized month name "${monthName}" in Monthly Archive link text "${dateText}".`);
    }
    const year = Number(yearStr);
    const day = Number(dayStr);
    const parsed = new Date(Date.UTC(year, monthIndex, day));
    const month = String(monthIndex + 1).padStart(2, '0');
    // The href attribute itself is HTML-entity-encoded in the raw page
    // (query-string `&` becomes `&amp;` on the November/October 2024
    // links, which carry `ss_campaign_id`/etc. tracking params) -- decode
    // it too, not just the visible link text, otherwise those bulletins'
    // URLs would open with a malformed query string.
    const href = decodeEntities(rawHref);
    const url = href.startsWith('http') ? href : `${SITE_BASE_URL}${href}`;
    return {
      id: `${year}-${month}`,
      title: `${monthName} ${year} Bulletin`,
      publishedAt: parsed.toISOString(),
      url,
    };
  });
}

function toBulletinRow(bulletin) {
  return [bulletin.id, bulletin.title, bulletin.publishedAt, bulletin.url];
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (read-only)' : 'LIVE RUN (will write)'}`);
  console.log(`Fetching "${ARCHIVE_PATH}"...`);
  const page = await fetchArchivePage();
  const bulletins = parseMonthlyArchiveLinks(page.mainContent);

  console.log(`\nParsed ${bulletins.length} bulletin(s) from the Monthly Archive list:`);
  for (const b of bulletins) {
    console.log(`  ${b.id}  "${b.title}"  ${b.publishedAt}  ${b.url}`);
  }

  console.log(`\nEnsuring "${BULLETINS_TAB}" tab exists...`);
  await ensureBulletinsTabExists();

  const existingRows = await getColumnWithRows(BULLETINS_TAB, 'A');
  const { toInsert, toUpdate } = partitionForUpsert(existingRows, bulletins, (b) => b.id, toBulletinRow);
  console.log(`\nUpsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

  if (DRY_RUN) {
    console.log('Dry run complete. No Sheet writes were made.');
    process.exit(0);
    return;
  }

  console.log('Appending new rows...');
  await appendRows(BULLETINS_TAB, toInsert);

  console.log('Updating existing rows...');
  await updateRows(BULLETINS_TAB, toUpdate);

  console.log('Done.');
}

// Guarded (unlike this repo's other one-off scripts) so
// parseMonthlyArchiveLinks can be imported for a unit test
// (seed-bulletins.test.js) without triggering a live fetch + Sheets calls
// as a side effect of the import itself.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
