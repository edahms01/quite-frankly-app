import { getOtpRecord, setOtpRecord, clearOtpRecord, MAX_ATTEMPTS } from './lib/otp.js';
import { sessions } from './lib/session.js';

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

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!email || !code) {
    return new Response(JSON.stringify({ error: 'email and code required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const record = await getOtpRecord(email);
  if (!record) {
    return new Response(JSON.stringify({ error: 'No code pending for this email', reason: 'expired' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return new Response(JSON.stringify({ error: 'Too many attempts', reason: 'locked' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (Date.now() > record.expiresAt) {
    await clearOtpRecord(email);
    return new Response(JSON.stringify({ error: 'Code expired', reason: 'expired' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (record.code !== code) {
    record.attempts += 1;
    await setOtpRecord(email, record);
    return new Response(
      JSON.stringify({
        error: 'Incorrect code',
        reason: 'mismatch',
        attemptsRemaining: MAX_ATTEMPTS - record.attempts,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  await clearOtpRecord(email);

  const sessionToken = await sessions.createSession(email);      // also indexes it by email so account deletion can find every session

  return new Response(JSON.stringify({ verified: true, sessionToken }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
