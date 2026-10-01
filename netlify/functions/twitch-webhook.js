import crypto from 'node:crypto';
import { getJSON, setJSON } from './lib/blobs.js';
import { getTokensForPreference, sendExpoPushBatch } from './lib/push.js';
import { isGenuineLiveEvent, isNewStreamId } from './lib/twitch.js';
import { buildFeedCache, pickMostRecent } from './lib/youtube.js';

// Recent-processed-id list kept short — only needs to survive a retried
// webhook delivery for the same stream, not serve as a long-term history.
const MAX_RECENT_STREAM_IDS = 20;

// Durable record of every notification delivery, keyed by Twitch's own
// message id — survives Netlify's short function-log retention (which lost
// the payload for the false alert this fix was written for). Best-effort:
// a logging failure must never break the actual webhook response.
async function logDelivery(messageId, entry) {
  try {
    await setJSON('qf-webhook-log', messageId, { loggedAt: new Date().toISOString(), ...entry });
  } catch (err) {
    console.error('Webhook delivery log write failed', err);
  }
}

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
  const messageId = req.headers.get('twitch-eventsub-message-id') ?? `no-id-${Date.now()}`;
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
        await logDelivery(messageId, {
          subscriptionType: eventType,
          event: body.event,
          decision: 'skipped',
          reason: `event.type "${body.event?.type}" is not a genuine live broadcast`,
        });
      } else {
        const streamId = body.event?.id;
        const current = await getJSON('qf-live-status', 'status', { isLive: false, checkedAt: null, recentStreamIds: [] });
        const recentStreamIds = current.recentStreamIds ?? [];
        const isNew = isNewStreamId(recentStreamIds, streamId);

        await setJSON('qf-live-status', 'status', {
          isLive: true,
          checkedAt: new Date().toISOString(),
          recentStreamIds: isNew ? [streamId, ...recentStreamIds].slice(0, MAX_RECENT_STREAM_IDS) : recentStreamIds,
        });

        // Go-live is the trigger to put tonight's YouTube stream in Home's
        // Most Recent slot right now, not at the next 15-min poll. Best-effort:
        // poll-youtube applies the same rule while isLive, so a miss self-heals.
        try {
          const archive = await getJSON('qf-youtube-archive', 'episodes', []);
          const tonights = pickMostRecent({ items: [], archive, isLive: true });
          if (tonights) await setJSON('qf-youtube-cache', 'feed', buildFeedCache(tonights, archive));
        } catch (err) {
          console.error('Pinning tonight\'s stream as Most Recent failed', err);
        }

        if (isNew) {
          let pushError = null;
          try {
            const tokens = await getTokensForPreference('live');
            await sendExpoPushBatch(tokens, {
              title: 'Quite Frankly is live',
              body: 'Frank just went live — tap to watch now.',
            });
          } catch (err) {
            console.error('Push notification step failed for stream.online', err);
            pushError = err.message;
          }
          await logDelivery(messageId, {
            subscriptionType: eventType,
            event: body.event,
            decision: 'alerted',
            reason: pushError ? `push send failed: ${pushError}` : 'genuine live event, new stream id',
          });
        } else {
          console.log('twitch stream.online push skipped, duplicate stream id', streamId);
          await logDelivery(messageId, {
            subscriptionType: eventType,
            event: body.event,
            decision: 'deduped',
            reason: `stream id "${streamId}" already processed`,
          });
        }
      }
    } else if (eventType === 'stream.offline') {
      const current = await getJSON('qf-live-status', 'status', { isLive: false, checkedAt: null, recentStreamIds: [] });
      await setJSON('qf-live-status', 'status', {
        isLive: false,
        checkedAt: new Date().toISOString(),
        recentStreamIds: current.recentStreamIds ?? [],
      });
      await logDelivery(messageId, {
        subscriptionType: eventType,
        event: body.event,
        decision: 'offline',
        reason: 'stream.offline, isLive cleared',
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
