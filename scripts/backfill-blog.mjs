// One-off backfill of quitefrankly.tv's two blog collections
// (quite-frankly-originals, original-articles) into Netlify Blobs (body
// content) + the 'blog posts' Google Sheet tab (metadata only, A-H, no
// bodyHtml column -- see the Global Constraints "Ruling (post-Task-2,
// 2026-09-28)": every post's body lives in Blobs now, not just oversized
// ones, after a live dry-run found 10 of 142 real posts exceeded the
// Sheet's 50,000-char cell limit, worst case 245,307 chars).
//
// Run with all Netlify env vars injected:
//   netlify dev:exec -- node scripts/backfill-blog.mjs --dry-run   (read-only report, no writes)
//   netlify dev:exec -- node scripts/backfill-blog.mjs             (live upsert: blob first, then Sheet row)
//
// The live run only happens after a human has reviewed the dry-run report.
//
// Squarespace enumeration/parsing (this script's first phase) needs no
// credentials at all -- it only hits the public quitefrankly.tv list JSON.
// Phase 2 (Sheet read + blob/Sheet writes) needs SPREADSHEET_ID +
// GOOGLE_SERVICE_ACCOUNT_JSON_B64 (Sheets) and a Netlify-Blobs-capable
// runtime context (Blobs auth is separate from the Sheets service account --
// see blobs.js). The script is deliberately ordered so the credential-free
// phase always completes and reports fully, even in a sandbox with no
// Sheets/Blobs access.

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
import { setJSON, blobStore } from '../netlify/functions/lib/blobs.js';
import {
  BLOG_COLLECTIONS,
  computeReadMinutes,
  iterateCollectionItems,
  mapItemToPost,
  median,
  toBlogPostRow,
  writeBlobsAndPartition,
} from '../netlify/functions/lib/squarespaceBlog.js';

const DRY_RUN = process.argv.includes('--dry-run');

// Dedicated Blobs store for post body content, keyed by Squarespace post id
// (Global Constraints: "a dedicated store (e.g. blog-bodies), keyed by post
// id"). Same shared store name Task 3's poller must write to.
const BLOG_BODIES_STORE = 'blog-bodies';

// Builds every post for one collection: pages the list JSON (throttled
// internally by squarespaceBlog.js), normalizes each body at write time
// (Global Constraints: normalize once, at write time, never at render
// time), computes readMinutes off the NORMALIZED body. No size guard --
// the old 45k-char stop-and-hold-out rule is moot now that body content
// lives in Blobs, not a Sheet cell. Every post found gets returned.
async function collectCollectionPosts(collection) {
  const posts = [];
  let videoEmbedPostCount = 0;

  for await (const item of iterateCollectionItems(collection)) {
    const mapped = mapItemToPost(item, collection);
    const { html: bodyHtml, videoEmbedCount } = normalizeBlogHtml(mapped.rawBodyHtml);

    if (videoEmbedCount > 0) videoEmbedPostCount++;

    posts.push({
      id: mapped.id,
      collection: mapped.collection,
      title: mapped.title,
      url: mapped.url,
      publishedAt: mapped.publishedAt,
      heroImageUrl: mapped.heroImageUrl,
      readMinutes: computeReadMinutes(bodyHtml),
      author: mapped.author,
      bodyHtml, // carried on the post record for the blob write; toBlogPostRow ignores it
    });
  }

  return { collection, posts, videoEmbedPostCount };
}

function printCollectionReport(result) {
  const { collection, posts, videoEmbedPostCount } = result;
  const byDateAsc = [...posts].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  const oldest = byDateAsc[0];
  const newest = byDateAsc[byDateAsc.length - 1];
  const lengths = posts.map((p) => p.bodyHtml.length);
  const maxLength = lengths.length > 0 ? Math.max(...lengths) : 0;
  const medianLength = median(lengths);

  console.log(`\n--- ${collection} ---`);
  console.log(`Total posts found: ${posts.length}`);
  console.log(`Oldest publishedAt: ${oldest ? `${oldest.publishedAt} ("${oldest.title}")` : 'none'}`);
  console.log(`Newest publishedAt: ${newest ? `${newest.publishedAt} ("${newest.title}")` : 'none'}`);
  console.log(`Max normalized bodyHtml length seen: ${maxLength} chars (informational -- no Sheet-cell guard applies, body lives in Blobs)`);
  console.log(`Median normalized bodyHtml length: ${medianLength} chars`);
  console.log(`Posts containing a video embed: ${videoEmbedPostCount}`);
}

// Counts every key currently in a Blobs store, via list()'s cursor-based
// pagination. Used for the post-write row-count/blob-count parity check.
async function countBlobs(storeName) {
  const store = blobStore(storeName);
  let count = 0;
  let cursor;
  do {
    const { blobs, cursor: nextCursor } = await store.list({ cursor });
    count += blobs.length;
    cursor = nextCursor;
  } while (cursor);
  return count;
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

  const allPosts = results.flatMap((r) => r.posts);
  console.log(`\nTotal posts across all collections: ${allPosts.length}`);

  console.log(`\nPhase 2: reading/writing the Sheet + Blobs (requires SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON_B64, and a Netlify-Blobs-capable runtime)...`);

  // ensureBlogPostsTabExists is idempotent (Task 1): creates the tab +
  // header row only if the tab doesn't exist yet, no-ops otherwise. This
  // runs even in --dry-run, because getColumnWithRows below needs the tab
  // to exist to be read at all -- there's no way to report an insert/update
  // plan without it. It never touches existing data.
  if (DRY_RUN) {
    console.log(`Note: even in --dry-run, this step creates the "${BLOG_POSTS_TAB}" tab + header row if it doesn't exist yet (needed to read column A below) -- it never touches existing data or writes any post rows/blobs.`);
  }
  console.log(`Ensuring "${BLOG_POSTS_TAB}" tab exists...`);
  await ensureBlogPostsTabExists();

  console.log(`Reading existing "${BLOG_POSTS_TAB}" rows (column A) for upsert...`);
  const existingRows = await getColumnWithRows(BLOG_POSTS_TAB, 'A');

  if (DRY_RUN) {
    // Dry run never writes a blob, so it can't discover real per-post blob
    // failures -- the insert/update plan here assumes every found post
    // would get a blob successfully. Only a live run can determine actual
    // blob-write failures (network/quota/etc.), which is a live-run-only
    // concept per the Global Constraints' skip-and-log rule.
    const { toInsert, toUpdate } = partitionForUpsert(existingRows, allPosts, (p) => p.id, toBlogPostRow);
    console.log(`Upsert plan (assumes every blob write succeeds): ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);
    console.log('\n--- DRY RUN SUMMARY ---');
    console.log(`Would write ${allPosts.length} blobs to the "${BLOG_BODIES_STORE}" store, then insert ${toInsert.length} / update ${toUpdate.length} Sheet rows.`);
    console.log('Dry run complete. No Sheet or Blob writes were made.');
    process.exit(0);
    return;
  }

  console.log(`Writing ${allPosts.length} blobs to "${BLOG_BODIES_STORE}" (blob first, then the matching Sheet row -- a post whose blob write fails is skipped and logged, never given a Sheet row with no matching blob)...`);
  const { writablePosts, blobFailures } = await writeBlobsAndPartition(allPosts, setJSON, BLOG_BODIES_STORE);
  if (blobFailures.length > 0) {
    console.error(`${blobFailures.length} post(s) had a failed blob write and were held out of the Sheet write entirely (never given a row with no matching blob):`);
    for (const f of blobFailures) {
      console.error(`  - ${f.id} "${f.title}" -- ${f.url} -- ${f.error}`);
    }
  }

  const { toInsert, toUpdate } = partitionForUpsert(existingRows, writablePosts, (p) => p.id, toBlogPostRow);
  console.log(`Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

  console.log('Appending new rows...');
  await appendRows(BLOG_POSTS_TAB, toInsert);

  console.log('Updating existing rows...');
  await updateRows(BLOG_POSTS_TAB, toUpdate);

  console.log('Setting columns A/E to TEXT format (prevents Sheets from reinterpreting ids/timestamps)...');
  await formatColumnsAsText(BLOG_POSTS_TAB, ['A', 'E']);

  console.log('Verifying final row count and row-count/blob-count parity...');
  const finalIds = await getColumn(BLOG_POSTS_TAB, 'A');
  // getColumn includes the header row (row 1); writablePosts does not.
  const expectedRows = writablePosts.length + 1;
  if (finalIds.length === expectedRows) {
    console.log(`MATCH: sheet has ${finalIds.length} rows in column A (including header), expected ${expectedRows}.`);
  } else {
    console.log(`MISMATCH: sheet has ${finalIds.length} rows in column A (including header), expected ${expectedRows}.`);
  }

  const blobCount = await countBlobs(BLOG_BODIES_STORE);
  const dataRowCount = finalIds.length - 1;
  if (blobCount === dataRowCount) {
    console.log(`MATCH: "${BLOG_BODIES_STORE}" has ${blobCount} blobs, sheet has ${dataRowCount} data rows.`);
  } else {
    console.log(`MISMATCH: "${BLOG_BODIES_STORE}" has ${blobCount} blobs, sheet has ${dataRowCount} data rows -- investigate before trusting this run.`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
