import { bearerToken, sessions } from './lib/session.js';

// POST, Authorization: Bearer <session>. Deletes that session (and its index entry). Idempotent: an unknown or already-deleted session is also `{ ok: true }`,
// so the app can always clear its own copy afterwards.
export default async (req, _ctx, deps = {}) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try { await (deps.sessions ?? sessions).revokeSession(bearerToken(req)); } catch {
    return new Response(JSON.stringify({ error: 'try_again' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};
