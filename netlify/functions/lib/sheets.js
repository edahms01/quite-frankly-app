import crypto from 'node:crypto';

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

  const response = await fetch('https://oauth2.googleapis.com/token', {
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
  const response = await fetch(
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
  const response = await fetch(sheetsUrl(`/values/${encodeURIComponent(range)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Sheets read of "${tab}" failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return (data.values || []).flat();
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
  const response = await fetch(sheetsUrl('/values:batchUpdate'), {
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
