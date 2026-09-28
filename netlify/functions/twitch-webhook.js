import crypto from 'node:crypto';
import { getJSON, setJSON } from './lib/blobs.js';
import { getTokensForPreference, sendExpoPushBatch } from './lib/push.js';
import { isGenuineLiveEvent, isNewStreamId } from './lib/twitch.js';

// Recent-processed-id list kept short — only needs to survive a retried
// webhook delivery for the same stream, not serve as a long-term history.
const MAX_RECENT_STREAM_IDS = 20;

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
      console.log('twitch stream.online event', JSON.stringify(body.event));

      if (!isGenuineLiveEvent(body.event)) {
        console.log('twitch stream.online ignored, not a genuine live broadcast', body.event?.type);
      } else {
        const streamId = body.event?.id;
        const current = await getJSON('qf-live-status', 'status', { isLive: false, checkedAt: null, recentStreamIds: [] });
        const recentStreamIds = current.recentStreamIds ?? [];
        const isNew = isNewStreamId(recentStreamIds, streamId);

        await setJSON('qf-live-status', 'status', {
          isLive: true,
          checkedAt: new Date().toISOString(),
          recentStreamIds: [streamId, ...recentStreamIds].slice(0, MAX_RECENT_STREAM_IDS),
        });

        if (isNew) {
          try {
            const tokens = await getTokensForPreference('live');
            await sendExpoPushBatch(tokens, {
              title: 'Quite Frankly is live',
              body: 'Frank just went live — tap to watch now.',
            });
          } catch (err) {
            console.error('Push notification step failed for stream.online', err);
          }
        } else {
          console.log('twitch stream.online push skipped, duplicate stream id', streamId);
        }
      }
    } else if (eventType === 'stream.offline') {
      const current = await getJSON('qf-live-status', 'status', { isLive: false, checkedAt: null, recentStreamIds: [] });
      await setJSON('qf-live-status', 'status', {
        isLive: false,
        checkedAt: new Date().toISOString(),
        recentStreamIds: current.recentStreamIds ?? [],
      });
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
