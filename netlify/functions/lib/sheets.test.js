// Unit tests for the getRows / ensureTabExists / ensureBlogPostsTabExists
// additions to sheets.js. No live network or real Sheets credentials: a
// throwaway RSA key pair stands in for the service account so getAccessToken
// runs its real JWT-signing code path, and global.fetch is replaced with a
// router that answers Google's OAuth token endpoint and the specific Sheets
// API endpoints these functions call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  getRows,
  ensureTabExists,
  ensureBlogPostsTabExists,
  BLOG_POSTS_TAB,
  BLOG_POSTS_HEADER,
} from './sheets.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const FAKE_SERVICE_ACCOUNT = {
  client_email: 'test@example.iam.gserviceaccount.com',
  private_key: privateKey,
};

process.env.SPREADSHEET_ID = 'test-spreadsheet-id';
process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 = Buffer.from(JSON.stringify(FAKE_SERVICE_ACCOUNT)).toString('base64');

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

// Installs a fetch mock for the duration of one test, routing by URL/method,
// and returns the call log plus a restore function.
function installFetchMock(handlers) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, init = {}) => {
    const urlStr = String(url);
    calls.push({ url: urlStr, method: init.method || 'GET', body: init.body });

    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return jsonResponse(200, { access_token: 'fake-access-token', expires_in: 3600 });
    }
    for (const handler of handlers) {
      const result = handler(urlStr, init);
      if (result) return result;
    }
    throw new Error(`Unhandled mock fetch call: ${init.method || 'GET'} ${urlStr}`);
  };
  return { calls, restore: () => { global.fetch = original; } };
}

test('getRows returns raw row-arrays for a whole range', async () => {
  const mock = installFetchMock([
    (url, init) => {
      if (url.includes('/values/') && (!init.method || init.method === 'GET')) {
        assert.match(url, /'blog posts'!A%3AI|blog%20posts.*A%3AI/);
        return jsonResponse(200, { values: [['1', 'x'], ['2', 'y']] });
      }
    },
  ]);
  try {
    const rows = await getRows('blog posts', 'A:I');
    assert.deepEqual(rows, [['1', 'x'], ['2', 'y']]);
  } finally {
    mock.restore();
  }
});

test('getRows returns an empty array when the range has no values', async () => {
  const mock = installFetchMock([
    (url, init) => {
      if (url.includes('/values/') && (!init.method || init.method === 'GET')) {
        return jsonResponse(200, {});
      }
    },
  ]);
  try {
    const rows = await getRows('blog posts', 'A:I');
    assert.deepEqual(rows, []);
  } finally {
    mock.restore();
  }
});

test('getRows throws with status and body text on a failed request', async () => {
  const mock = installFetchMock([
    (url, init) => {
      if (url.includes('/values/') && (!init.method || init.method === 'GET')) {
        return jsonResponse(500, { error: 'boom' });
      }
    },
  ]);
  try {
    await assert.rejects(() => getRows('blog posts', 'A:I'), /Sheets read of "blog posts" failed: 500/);
  } finally {
    mock.restore();
  }
});

test('ensureTabExists is a no-op when the tab already exists', async () => {
  const mock = installFetchMock([
    (url) => {
      if (url.includes('fields=sheets.properties')) {
        return jsonResponse(200, { sheets: [{ properties: { sheetId: 42, title: 'blog posts' } }] });
      }
    },
  ]);
  try {
    const result = await ensureTabExists('blog posts', BLOG_POSTS_HEADER);
    assert.deepEqual(result, { created: false });
    const structuralCalls = mock.calls.filter((c) => c.url.endsWith(':batchUpdate'));
    const headerWrites = mock.calls.filter((c) => c.method === 'PUT');
    assert.equal(structuralCalls.length, 0, 'must not call addSheet when the tab already exists');
    assert.equal(headerWrites.length, 0, 'must not overwrite the header row when the tab already exists');
  } finally {
    mock.restore();
  }
});

test('ensureTabExists creates the tab and writes the header row when missing', async () => {
  const mock = installFetchMock([
    (url) => {
      if (url.includes('fields=sheets.properties')) {
        // "blog posts" is absent -> getSheetId throws its "no tab named" error.
        return jsonResponse(200, { sheets: [{ properties: { sheetId: 1, title: 'other tab' } }] });
      }
    },
    (url, init) => {
      if (url.endsWith(':batchUpdate') && init.method === 'POST') {
        const payload = JSON.parse(init.body);
        assert.deepEqual(payload.requests, [{ addSheet: { properties: { title: 'blog posts' } } }]);
        return jsonResponse(200, { replies: [{ addSheet: { properties: { sheetId: 99 } } }] });
      }
    },
    (url, init) => {
      if (url.includes('/values/') && init.method === 'PUT') {
        assert.match(url, /valueInputOption=RAW/);
        const payload = JSON.parse(init.body);
        assert.deepEqual(payload.values, [BLOG_POSTS_HEADER]);
        return jsonResponse(200, { updatedCells: BLOG_POSTS_HEADER.length });
      }
    },
  ]);
  try {
    const result = await ensureTabExists('blog posts', BLOG_POSTS_HEADER);
    assert.deepEqual(result, { created: true });
    const addSheetCalls = mock.calls.filter((c) => c.url.endsWith(':batchUpdate'));
    const headerWrites = mock.calls.filter((c) => c.method === 'PUT');
    assert.equal(addSheetCalls.length, 1);
    assert.equal(headerWrites.length, 1);
  } finally {
    mock.restore();
  }
});

test('ensureBlogPostsTabExists uses the fixed tab name and header', async () => {
  const mock = installFetchMock([
    (url) => {
      if (url.includes('fields=sheets.properties')) {
        return jsonResponse(200, { sheets: [{ properties: { sheetId: 5, title: BLOG_POSTS_TAB } }] });
      }
    },
  ]);
  try {
    const result = await ensureBlogPostsTabExists();
    assert.deepEqual(result, { created: false });
  } finally {
    mock.restore();
  }
});

test('ensureTabExists propagates a non-"missing tab" error from getSheetId instead of trying to create the tab', async () => {
  const mock = installFetchMock([
    (url) => {
      if (url.includes('fields=sheets.properties')) {
        return jsonResponse(500, { error: 'server exploded' });
      }
    },
  ]);
  try {
    await assert.rejects(
      () => ensureTabExists('blog posts', BLOG_POSTS_HEADER),
      /Sheets metadata fetch failed: 500/
    );
    const addSheetCalls = mock.calls.filter((c) => c.url.endsWith(':batchUpdate'));
    assert.equal(addSheetCalls.length, 0, 'must not attempt to create the tab on an unrelated failure');
  } finally {
    mock.restore();
  }
});

test('ensureTabExists creates the tab without writing a header row when headerRow is empty', async () => {
  const mock = installFetchMock([
    (url) => {
      if (url.includes('fields=sheets.properties')) {
        return jsonResponse(200, { sheets: [] });
      }
    },
    (url, init) => {
      if (url.endsWith(':batchUpdate') && init.method === 'POST') {
        return jsonResponse(200, { replies: [{}] });
      }
    },
  ]);
  try {
    const result = await ensureTabExists('empty header tab', []);
    assert.deepEqual(result, { created: true });
    const headerWrites = mock.calls.filter((c) => c.method === 'PUT');
    assert.equal(headerWrites.length, 0);
  } finally {
    mock.restore();
  }
});
