import crypto from 'node:crypto';
import { setJSON } from './lib/blobs.js';

const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

function verifySignature(req, rawBody) {
  const messageId = req.headers.get('twitch-eventsub-message-id') ?? '';
  const timestamp = req.headers.get('twitch-eventsub-message-timestamp') ?? '';
  const signature = req.headers.get('twitch-eventsub-message-signature') ?? '';

  const hmac = crypto
    .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET)
    .update(messageId + timestamp + rawBody)
    .digest('hex');
  const expected = `sha256=${hmac}`;

  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();

  if (!verifySignature(req, rawBody)) {
    return new Response('Invalid signature', { status: 403 });
  }

  const messageType = req.headers.get('twitch-eventsub-message-type');
  const body = JSON.parse(rawBody);

  if (messageType === MESSAGE_TYPE_VERIFICATION) {
    return new Response(body.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  if (messageType === MESSAGE_TYPE_NOTIFICATION) {
    const eventType = body.subscription?.type;
    if (eventType === 'stream.online') {
      await setJSON('qf-live-status', 'status', { isLive: true, checkedAt: new Date().toISOString() });
    } else if (eventType === 'stream.offline') {
      await setJSON('qf-live-status', 'status', { isLive: false, checkedAt: new Date().toISOString() });
    }
    return new Response(null, { status: 204 });
  }

  if (messageType === MESSAGE_TYPE_REVOCATION) {
    await setJSON('qf-live-status', 'meta', {
      revokedAt: new Date().toISOString(),
      reason: body.subscription?.status ?? 'unknown',
    });
    return new Response(null, { status: 204 });
  }

  return new Response('Unhandled message type', { status: 400 });
};
