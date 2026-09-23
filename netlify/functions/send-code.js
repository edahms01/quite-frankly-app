import { Resend } from 'resend';
import { generateCode, getOtpRecord, setOtpRecord, RESEND_COOLDOWN_MS, CODE_TTL_MS } from './lib/otp.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = Date.now();
  const existing = await getOtpRecord(email);
  if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
    const retryAfterMs = RESEND_COOLDOWN_MS - (now - existing.sentAt);
    return new Response(JSON.stringify({ error: 'Too many requests', retryAfterMs }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const code = generateCode();
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Your Quite Frankly verification code',
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await setOtpRecord(email, {
    code,
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    sentAt: now,
  });

  return new Response(JSON.stringify({ ok: true, cooldownMs: RESEND_COOLDOWN_MS }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
