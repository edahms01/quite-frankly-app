// One-off backfill of quitefrankly.tv's newsletter-content collection into
// Netlify Blobs (body content) + the 'newsletter posts' Google Sheet tab
// (metadata only, A-I). Structurally identical to backfill-blog.mjs --
// same phase-1-credential-free / phase-2-write split, same blob-then-row
// invariant.
//
// Run with all Netlify env vars injected:
//   netlify dev:exec -- node scripts/backfill-newsletter.mjs --dry-run   (read-only report, no writes)
//   netlify dev:exec -- node scripts/backfill-newsletter.mjs             (live upsert: blob first, then Sheet row)

import {
  appendRows,
  ensureNewsletterPostsTabExists,
  formatColumnsAsText,
  getColumn,
  getColumnWithRows,
  NEWSLETTER_POSTS_TAB,
  updateRows,
} from '../netlify/functions/lib/sheets.js';
import { partitionForUpsert } from '../netlify/functions/lib/idempotency.js';
import { setJSON, blobStore } from '../netlify/functions/lib/blobs.js';
import {
  NEWSLETTER_BODIES_STORE,
  NEWSLETTER_COLLECTIONS,
  buildNewsletterPostRecord,
  iterateCollectionItems,
  median,
  toNewsletterPostRow,
  writeBlobsAndPartition,
} from '../netlify/functions/lib/squarespaceNewsletter.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function collectCollectionPosts(collection) {
  const posts = [];
  let videoEmbedPostCount = 0;

  for await (const item of iterateCollectionItems(collection)) {
    const { post, videoEmbedCount } = buildNewsletterPostRecord(item);
    if (videoEmbedCount > 0) videoEmbedPostCount++;
    posts.push(post);
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
  console.log(`Max normalized bodyHtml length seen: ${maxLength} chars`);
  console.log(`Median normalized bodyHtml length: ${medianLength} chars`);
  console.log(`Posts containing a video embed: ${videoEmbedPostCount}`);

  const catCounts = new Map();
  for (const p of posts) {
    for (const c of p.categories) catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
  }
  console.log('Category counts:');
  for (const [cat, count] of [...catCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
}

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
  console.log('Phase 1: enumerating the Squarespace newsletter collection (no credentials required)...');

  const results = [];
  for (const collection of NEWSLETTER_COLLECTIONS) {
    console.log(`Fetching "${collection}"...`);
    results.push(await collectCollectionPosts(collection));
  }

  console.log('\n=== SQUARESPACE ENUMERATION REPORT ===');
  for (const result of results) {
    printCollectionReport(result);
  }

  const allPosts = results.flatMap((r) => r.posts);
  console.log(`\nTotal posts across all collections: ${allPosts.length}`);

  console.log('\nPhase 2: reading/writing the Sheet + Blobs (requires SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON_B64, and a Netlify-Blobs-capable runtime)...');

  if (DRY_RUN) {
    console.log(`Note: even in --dry-run, this step creates the "${NEWSLETTER_POSTS_TAB}" tab + header row if it doesn't exist yet -- it never touches existing data or writes any post rows/blobs.`);
  }
  console.log(`Ensuring "${NEWSLETTER_POSTS_TAB}" tab exists...`);
  await ensureNewsletterPostsTabExists();

  console.log(`Reading existing "${NEWSLETTER_POSTS_TAB}" rows (column A) for upsert...`);
  const existingRows = await getColumnWithRows(NEWSLETTER_POSTS_TAB, 'A');

  if (DRY_RUN) {
    const { toInsert, toUpdate } = partitionForUpsert(existingRows, allPosts, (p) => p.id, toNewsletterPostRow);
    console.log(`Upsert plan (assumes every blob write succeeds): ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);
    console.log('\n--- DRY RUN SUMMARY ---');
    console.log(`Would write ${allPosts.length} blobs to the "${NEWSLETTER_BODIES_STORE}" store, then insert ${toInsert.length} / update ${toUpdate.length} Sheet rows.`);
    console.log('Dry run complete. No Sheet or Blob writes were made.');
    process.exit(0);
    return;
  }

  console.log(`Writing ${allPosts.length} blobs to "${NEWSLETTER_BODIES_STORE}" (blob first, then the matching Sheet row)...`);
  const { writablePosts, blobFailures } = await writeBlobsAndPartition(allPosts, setJSON, NEWSLETTER_BODIES_STORE);
  if (blobFailures.length > 0) {
    console.error(`${blobFailures.length} post(s) had a failed blob write and were held out of the Sheet write entirely:`);
    for (const f of blobFailures) {
      console.error(`  - ${f.id} "${f.title}" -- ${f.url} -- ${f.error}`);
    }
  }

  const { toInsert, toUpdate } = partitionForUpsert(existingRows, writablePosts, (p) => p.id, toNewsletterPostRow);
  console.log(`Upsert plan: ${toInsert.length} new row(s) to insert, ${toUpdate.length} existing row(s) to update.`);

  console.log('Appending new rows...');
  await appendRows(NEWSLETTER_POSTS_TAB, toInsert);

  console.log('Updating existing rows...');
  await updateRows(NEWSLETTER_POSTS_TAB, toUpdate);

  console.log('Setting columns A/D to TEXT format (prevents Sheets from reinterpreting ids/timestamps)...');
  await formatColumnsAsText(NEWSLETTER_POSTS_TAB, ['A', 'D']);

  console.log('Verifying final row count and row-count/blob-count parity...');
  const finalIds = await getColumn(NEWSLETTER_POSTS_TAB, 'A');
  const expectedRows = writablePosts.length + 1;
  if (finalIds.length === expectedRows) {
    console.log(`MATCH: sheet has ${finalIds.length} rows in column A (including header), expected ${expectedRows}.`);
  } else {
    console.log(`MISMATCH: sheet has ${finalIds.length} rows in column A (including header), expected ${expectedRows}.`);
  }

  const blobCount = await countBlobs(NEWSLETTER_BODIES_STORE);
  const dataRowCount = finalIds.length - 1;
  if (blobCount === dataRowCount) {
    console.log(`MATCH: "${NEWSLETTER_BODIES_STORE}" has ${blobCount} blobs, sheet has ${dataRowCount} data rows.`);
  } else {
    console.log(`MISMATCH: "${NEWSLETTER_BODIES_STORE}" has ${blobCount} blobs, sheet has ${dataRowCount} data rows -- investigate before trusting this run.`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
