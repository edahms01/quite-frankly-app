// One-off backfill of quitefrankly.tv's two blog collections
// (quite-frankly-originals, original-articles) into the 'blog posts' Google
// Sheet tab (Task 1's schema: id/collection/title/url/publishedAt/
// heroImageUrl/readMinutes/author/bodyHtml, A-I).
//
// Run with all Netlify env vars injected:
//   netlify dev:exec -- node scripts/backfill-blog.mjs --dry-run   (read-only report, no writes)
//   netlify dev:exec -- node scripts/backfill-blog.mjs             (live upsert)
//
// The live run only happens after a human has reviewed the dry-run report.
//
// Squarespace enumeration/parsing (this script's first phase) needs no
// credentials at all -- it only hits the public quitefrankly.tv list JSON.
// Only the Sheets read/write phase needs SPREADSHEET_ID +
// GOOGLE_SERVICE_ACCOUNT_JSON_B64 (Netlify env vars). The script is
// deliberately ordered so the credential-free phase always completes and
// reports fully, even in a sandbox with no Sheets access.

import {
  appendRows,
  ensureBlogPostsTabExists,
  formatColumnsAsText,
  getColumn,
  getColumnWithRows,
  BLOG_POSTS_TAB,
  updateRows,
} from '../netlify/functions/lib/sheets.js';
import { partitionForUpsert } from '../netlify/functions/lib/idempotency.js';
import { normalizeBlogHtml } from '../netlify/functions/lib/normalizeBlogHtml.js';
import {
  BLOG_COLLECTIONS,
  MAX_BODY_HTML_CHARS,
  computeReadMinutes,
  iterateCollectionItems,
  mapItemToPost,
  toBlogPostRow,
} from '../netlify/functions/lib/squarespaceBlog.js';

const DRY_RUN = process.argv.includes('--dry-run');

// Builds every post for one collection: pages the list JSON (throttled
// internally by squarespaceBlog.js), normalizes each body at write time
// (Global Constraints: normalize once, at write time, never at render
// time), computes readMinutes off the NORMALIZED body, and applies the
// ~45k-char guard. Oversized posts are held out of `posts` and returned
// separately in `oversized` -- never written, always reported.
async function collectCollectionPosts(collection) {
  const posts = [];
  const oversized = [];
  let maxBodyHtmlLength = 0;
  let videoEmbedPostCount = 0;

  for await (const item of iterateCollectionItems(collection)) {
    const mapped = mapItemToPost(item, collection);
    const { html: bodyHtml, videoEmbedCount } = normalizeBlogHtml(mapped.rawBodyHtml);

    maxBodyHtmlLength = Math.max(maxBodyHtmlLength, bodyHtml.length);
    if (videoEmbedCount > 0) videoEmbedPostCount++;

    const post = {
      id: mapped.id,
      collection: mapped.collection,
      title: mapped.title,
      url: mapped.url,
      publishedAt: mapped.publishedAt,
      heroImageUrl: mapped.heroImageUrl,
      readMinutes: computeReadMinutes(bodyHtml),
      author: mapped.author,
      bodyHtml,
    };

    if (bodyHtml.length > MAX_BODY_HTML_CHARS) {
      oversized.push({ id: post.id, title: post.title, url: post.url, publishedAt: post.publishedAt, length: bodyHtml.length });
    } else {
      posts.push(post);
    }
  }

  return { collection, posts, oversized, maxBodyHtmlLength, videoEmbedPostCount };
}

function printCollectionReport(result) {
  const { collection, posts, oversized, maxBodyHtmlLength, videoEmbedPostCount } = result;
  // Oldest/newest span every post actually found on the site (writable +
  // oversized), not just the writable subset -- an oversized post could
  // otherwise silently hide the true range from the human reviewing this.
  const byDateAsc = [...posts, ...oversized].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  const oldest = byDateAsc[0];
  const newest = byDateAsc[byDateAsc.length - 1];

  console.log(`\n--- ${collection} ---`);
  console.log(`Total posts found: ${posts.length + oversized.length}`);
  console.log(`Writable (within ${MAX_BODY_HTML_CHARS}-char guard): ${posts.length}`);
  console.log(`Oldest publishedAt: ${oldest ? `${oldest.publishedAt} ("${oldest.title}")` : 'none'}`);
  console.log(`Newest publishedAt: ${newest ? `${newest.publishedAt} ("${newest.title}")` : 'none'}`);
  console.log(`Max normalized bodyHtml length seen: ${maxBodyHtmlLength} chars`);
  console.log(`Posts containing a video embed: ${videoEmbedPostCount}`);
  if (oversized.length > 0) {
    console.log(`OVERSIZED (exceeds ${MAX_BODY_HTML_CHARS} chars, held out of this run -- NOT written):`);
    for (const o of oversized) {
      console.log(`  - ${o.id} "${o.title}" -- ${o.length} chars -- ${o.url}`);
    }
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (read-only)' : 'LIVE RUN (will write)'}`);
  console.log('Phase 1: enumerating Squarespace collections (no credentials required)...');

  const results = [];
  for (const collection of BLOG_COLLECTIONS) {
    console.log(`Fetching "${collection}"...`);
    results.push(await collectCollectionPosts(collection));
  }

  console.log('\n=== SQUARESPACE ENUMERATION REPORT ===');
  for (const result of results) {
    printCollectionReport(result);
  }

  const allOversized = results.flatMap((r) => r.oversized);
  const allPosts = results.flatMap((r) => r.posts);
  console.log(`\nTotal writable posts across all collections: ${allPosts.length}`);
  if (allOversized.length > 0) {
    console.log(`Total oversized posts held out across all collections: ${allOversized.length} -- see per-collection lists above. No truncation strategy was applied; these need an explicit decision before they can be written.`);
  }

  console.log('\nPhase 2: reading/writing the Sheet (requires SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON_B64)...');

  // ensureBlogPostsTabExists is idempotent (Task 1): creates the tab +
  // header row only if the tab doesn't exist yet, no-ops otherwise. This
  // runs even in --dry-run, because getColumnWithRows below needs the tab
  // to exist to be read at all -- there's no way to report an insert/update
  // plan without it. It never touches existing data.
  console.log(`Ensuring "${BLOG_POSTS_TAB}" tab exists...`);
  await ensureBlogPostsTabExists();

  console.log(`Reading existing "${BLOG_POSTS_TAB}" rows (column A) for upsert...`);
  const existingRows = await getColumnWithRows(BLOG_POSTS_TAB, 'A');

  const { toInsert, toUpdate } = partitionForUpsert(existingRows, allPosts, (p) => p.id, toBlogPostRow);
  console.log(`Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN SUMMARY ---');
    console.log(`Would insert: ${toInsert.length} new rows, update: ${toUpdate.length} existing rows.`);
    if (allOversized.length > 0) {
      console.log(`${allOversized.length} post(s) held out for exceeding the ${MAX_BODY_HTML_CHARS}-char guard -- resolve before a live run includes them.`);
    }
    console.log('Dry run complete. No Sheet writes were made.');
    process.exit(0);
    return;
  }

  console.log('Appending new rows...');
  await appendRows(BLOG_POSTS_TAB, toInsert);

  console.log('Updating existing rows...');
  await updateRows(BLOG_POSTS_TAB, toUpdate);

  console.log('Setting columns A/E/I to TEXT format (prevents Sheets from reinterpreting ids/timestamps)...');
  await formatColumnsAsText(BLOG_POSTS_TAB, ['A', 'E', 'I']);

  console.log('Verifying final row count...');
  const finalIds = await getColumn(BLOG_POSTS_TAB, 'A');
  // getColumn includes the header row (row 1); allPosts does not.
  const expected = allPosts.length + 1;
  if (finalIds.length === expected) {
    console.log(`MATCH: sheet has ${finalIds.length} rows in column A (including header), expected ${expected}.`);
  } else {
    console.log(`MISMATCH: sheet has ${finalIds.length} rows in column A (including header), expected ${expected}.`);
  }

  if (allOversized.length > 0) {
    console.log(`\n${allOversized.length} post(s) were held out for exceeding the ${MAX_BODY_HTML_CHARS}-char guard and were NOT written -- see the report above.`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
