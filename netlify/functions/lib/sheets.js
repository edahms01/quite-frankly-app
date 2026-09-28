import crypto from 'node:crypto';
import { fetchWithBackoff } from './fetchWithBackoff.js';

let cachedToken = null;
let cachedTokenExpiry = 0;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON_B64 not set');
  return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiry > now + 30) {
    return cachedToken;
  }

  const sa = getServiceAccount();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(sa.private_key));
  const jwt = `${unsigned}.${signature}`;

  const response = await fetchWithBackoff('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = now + data.expires_in;
  return cachedToken;
}

function sheetsUrl(path) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID not set');
  return `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`;
}

export async function appendRows(tab, rows) {
  if (rows.length === 0) return { updates: { updatedRows: 0 } };
  const token = await getAccessToken();
  const range = `'${tab}'!A1`;
  const response = await fetchWithBackoff(
    `${sheetsUrl(`/values/${encodeURIComponent(range)}:append`)}?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );
  if (!response.ok) {
    throw new Error(`Sheets append to "${tab}" failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

export async function appendRow(tab, values) {
  return appendRows(tab, [values]);
}

export async function getColumn(tab, columnLetter) {
  const token = await getAccessToken();
  const range = `'${tab}'!${columnLetter}:${columnLetter}`;
  const response = await fetchWithBackoff(sheetsUrl(`/values/${encodeURIComponent(range)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Sheets read of "${tab}" failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return (data.values || []).flat();
}

// One GET returning raw row-arrays for a whole range (e.g. 'A:H', 'A2:I').
// Same "no header handling, that's the caller's job" convention as
// getColumn/getColumnWithRows: row 1 is included like any other row if the
// range covers it. `range` is the A1-notation range WITHOUT the tab name
// (this function prefixes it with 'tab'! itself), matching getColumn's
// calling convention of passing just the column letter(s).
export async function getRows(tab, range) {
  const token = await getAccessToken();
  const fullRange = `'${tab}'!${range}`;
  const response = await fetchWithBackoff(sheetsUrl(`/values/${encodeURIComponent(fullRange)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Sheets read of "${tab}" failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.values || [];
}

// Column values WITH 1-based sheet row numbers (reuses the existing GET —
// no extra API call). No assumption about a header row: row 1 is included
// like any other row. If it's a header, it simply never matches a real
// dedupe key during upsert, so it's harmless to include.
export async function getColumnWithRows(tab, columnLetter) {
  const values = await getColumn(tab, columnLetter);
  return values.map((value, i) => ({ row: i + 1, value }));
}

// One HTTP call (spreadsheets.values:batchUpdate) for many discontiguous
// row updates — avoids N calls for N rows when backfilling hundreds of
// existing rows. Each entry overwrites the FULL range given, so callers
// must pass complete rows (A..last column), not partial patches.
export async function batchUpdateRanges(updates /* [{range, values}] */) {
  if (updates.length === 0) return { totalUpdatedRows: 0 };
  const token = await getAccessToken();
  const response = await fetchWithBackoff(sheetsUrl('/values:batchUpdate'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: updates.map((u) => ({ range: u.range, values: u.values })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Sheets batchUpdate failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// Ergonomic wrapper: builds 'tab'!A{row}:{lastCol}{row} ranges from
// [{row, values}] and calls batchUpdateRanges. Chunks into groups of 500
// rows per call as a defensive measure against payload-size limits if the
// channel history turns out much larger than expected.
export async function updateRows(tab, rowUpdates /* [{row, values}] */) {
  if (rowUpdates.length === 0) return [];
  const CHUNK_SIZE = 500;
  const results = [];
  for (let i = 0; i < rowUpdates.length; i += CHUNK_SIZE) {
    const chunk = rowUpdates.slice(i, i + CHUNK_SIZE);
    const updates = chunk.map(({ row, values }) => {
      const lastCol = String.fromCharCode(64 + values.length); // A=1..Z=26 — plenty for our row widths (max 12 cols)
      return { range: `'${tab}'!A${row}:${lastCol}${row}`, values: [values] };
    });
    results.push(await batchUpdateRanges(updates));
  }
  return results;
}

// Resolves the numeric sheetId for a tab name. The spreadsheet-level
// :batchUpdate endpoint (structural/formatting requests) addresses tabs
// via GridRange.sheetId, not A1-notation tab names like the values
// endpoints use.
export async function getSheetId(tab) {
  const token = await getAccessToken();
  const response = await fetch(sheetsUrl('?fields=sheets.properties(sheetId,title)'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Sheets metadata fetch failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const sheet = (data.sheets || []).find((s) => s.properties.title === tab);
  if (!sheet) {
    throw new Error(`Sheets metadata fetch: no tab named "${tab}" found`);
  }
  return sheet.properties.sheetId;
}

// Matches the specific "tab doesn't exist" error getSheetId throws above —
// used by ensureTabExists to distinguish "missing tab, go create it" from
// any other failure (network error, bad spreadsheet id, etc.), which
// should propagate instead of being swallowed.
const NO_TAB_NAMED_RE = /no tab named/;

// Idempotent: creates `tab` (via the spreadsheet-level batchUpdate addSheet
// request) and writes `headerRow` into A1:{lastCol}1 if the tab doesn't
// already exist yet; no-ops (does not touch the header row) if it does.
// Existence is checked via getSheetId — if it resolves, the tab is already
// there and left untouched (so a pre-existing header is never clobbered by
// a later ensureTabExists call). Only getSheetId's specific "no tab named"
// error is treated as "go create it"; any other error propagates.
export async function ensureTabExists(tab, headerRow) {
  try {
    await getSheetId(tab);
    return { created: false };
  } catch (err) {
    if (!NO_TAB_NAMED_RE.test(err.message)) throw err;
  }

  const token = await getAccessToken();
  const addResponse = await fetch(sheetsUrl(':batchUpdate'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
  });
  if (!addResponse.ok) {
    throw new Error(`Sheets addSheet for "${tab}" failed: ${addResponse.status} ${await addResponse.text()}`);
  }

  if (headerRow && headerRow.length > 0) {
    const lastCol = String.fromCharCode(64 + headerRow.length); // A=1..Z=26
    const range = `'${tab}'!A1:${lastCol}1`;
    const headerResponse = await fetch(
      `${sheetsUrl(`/values/${encodeURIComponent(range)}`)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, values: [headerRow] }),
      }
    );
    if (!headerResponse.ok) {
      throw new Error(`Sheets header write for "${tab}" failed: ${headerResponse.status} ${await headerResponse.text()}`);
    }
  }

  return { created: true };
}

// Fixed schema for the blog-reading feature's Sheet tab -- metadata only,
// columns A-H, exact order. `bodyHtml` (formerly column I) was removed:
// live dry-run data found 10 of 142 real posts exceed the Sheet's 50,000-
// char cell limit (worst case 245k chars), so bodyHtml now lives in Netlify
// Blobs for every post rather than branching on size -- see the backfill
// script / read function for the Blobs read/write side of that. Exported
// alongside the ensure helper so later tasks (backfill script, poller)
// import both the tab name and header spec from one place rather than
// re-typing the column list.
export const BLOG_POSTS_TAB = 'blog posts';
export const BLOG_POSTS_HEADER = [
  'id',
  'collection',
  'title',
  'url',
  'publishedAt',
  'heroImageUrl',
  'readMinutes',
  'author',
];

export async function ensureBlogPostsTabExists() {
  return ensureTabExists(BLOG_POSTS_TAB, BLOG_POSTS_HEADER);
}

// Newsletter posts -- metadata only, same Blobs-for-body split as blog
// posts. `category` is the primary category (categories[0]); `categories`
// holds all of them, comma-separated, for the "matches any" chip filter.
export const NEWSLETTER_POSTS_TAB = 'newsletter posts';
export const NEWSLETTER_POSTS_HEADER = [
  'id',
  'title',
  'url',
  'publishedAt',
  'heroImageUrl',
  'readMinutes',
  'author',
  'category',
  'categories',
];

export async function ensureNewsletterPostsTabExists() {
  return ensureTabExists(NEWSLETTER_POSTS_TAB, NEWSLETTER_POSTS_HEADER);
}

// Bulletins -- hand-maintained after the one-time seed (see
// scripts/seed-bulletins.mjs). No body/author/hero columns: the app never
// renders a bulletin natively, only opens `url` (the campaign link) in the
// in-app browser.
export const BULLETINS_TAB = 'bulletins';
export const BULLETINS_HEADER = ['id', 'title', 'publishedAt', 'url'];

export async function ensureBulletinsTabExists() {
  return ensureTabExists(BULLETINS_TAB, BULLETINS_HEADER);
}

// Sets whole columns' number format to TEXT so Sheets stops flagging
// numeric-/time-looking TEXT-typed cells (written with valueInputOption:
// 'RAW') with its "this is explicitly text" apostrophe indicator. Pure
// formatting -- never touches cell values. Safe to call on every run
// (idempotent) and safe against columns that already hold thousands of
// written rows. Unbounded GridRange (no start/endRowIndex) covers the
// whole column, including rows the live pollers append later.
export async function formatColumnsAsText(tab, columnLetters) {
  if (columnLetters.length === 0) return { replies: [] };
  const sheetId = await getSheetId(tab);
  const token = await getAccessToken();
  const requests = columnLetters.map((letter) => {
    const columnIndex = letter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, ...
    return {
      repeatCell: {
        range: { sheetId, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'TEXT' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    };
  });
  const response = await fetch(sheetsUrl(':batchUpdate'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!response.ok) {
    throw new Error(`Sheets column format update for "${tab}" failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}
