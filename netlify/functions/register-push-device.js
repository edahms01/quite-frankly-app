import { setJSON } from './lib/blobs.js';

const EXPO_TOKEN_PATTERN = /^ExponentPushToken\[[\w-]+\]$/;

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

  const pushToken = typeof body.pushToken === 'string' ? body.pushToken.trim() : '';
  if (!pushToken || !EXPO_TOKEN_PATTERN.test(pushToken)) {
    return new Response(
      JSON.stringify({ error: 'pushToken is required and must be a valid Expo push token' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const raw = body.preferences && typeof body.preferences === 'object' ? body.preferences : {};
  const preferences = {
    live: raw.live !== false,
    video: raw.video !== false,
    club: raw.club !== false,
  };

  await setJSON('qf-push-tokens', pushToken, {
    pushToken,
    preferences,
    updatedAt: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
