import crypto from 'node:crypto';
import { appendRow } from './lib/sheets.js';
import { blobStore } from './lib/blobs.js';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function deriveTitle(description) {
  const trimmed = description.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}...`;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return new Response(JSON.stringify({ error: 'description is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let screenshotUrl = '';
  if (body.screenshotBase64) {
    const buffer = Buffer.from(body.screenshotBase64, 'base64');
    if (buffer.byteLength > MAX_SCREENSHOT_BYTES) {
      return new Response(JSON.stringify({ error: 'Screenshot too large' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const id = crypto.randomUUID();
    const store = blobStore('qf-bug-screenshots');
    await store.set(id, buffer, {
      metadata: { contentType: body.screenshotMimeType || 'image/jpeg' },
    });
    const requestUrl = new URL(req.url);
    screenshotUrl = `${requestUrl.origin}/.netlify/functions/get-bug-screenshot?id=${id}`;
  }

  const deviceInfo = typeof body.deviceInfo === 'string' ? body.deviceInfo : '';
  const timestamp = new Date().toISOString();
  const title = deriveTitle(description);

  try {
    await appendRow('Bug Reports', [timestamp, title, description, screenshotUrl, deviceInfo]);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to save bug report' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
