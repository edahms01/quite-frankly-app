import { bearerToken, sessions } from './lib/session.js';
import { signLinkToken } from './lib/linktoken.js';
import { allow } from './lib/ratelimit.js';
import { clearOtpRecord } from './lib/otp.js';
import { deleteKey } from './lib/blobs.js';

// POST, Authorization: Bearer <session>, body { pushToken? }. Deletes EVERYTHING this site holds for the signed-in address, then the linked AskFrankie account:
//   1. AskFrankie first (server to server, a `delete`-purpose token signed here): if that fails nothing is deleted yet and the answer is "try again", so the person
//      can retry with the same session. "No such account" is a success on AskFrankie's side (idempotent).
//   2. the OTP entry, the device's push registration (the device sends its own token: push tokens are not tied to an email), every other session of the address
//      (via the email index), and the session that made the request LAST (so a failed step can be retried).
// The email comes ONLY from the stored session, never from the request. Deleting twice is fine (the second call has no session: 401, and the client then just
// clears its own data). Used by the in-app "Delete account" and the public web page (which signs in with send-code / verify-code first).
const PUSH_TOKEN_RE = /^ExponentPushToken\[[\w-]+\]$/;
const PER_HOUR = 5;
const ASKFRANKIE_API = (process.env.ASKFRANKIE_API_BASE || 'https://ask-frankie-pipeline.netlify.app').replace(/\/$/, '');

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req, _ctx, deps = {}) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const S = deps.sessions ?? sessions;
  const token = bearerToken(req);
  const session = await S.getSession(token);
  if (!session) return reply(401, { error: 'unauthorized' });
  if (!(await (deps.allow ?? allow)(`delete:${session.email}`, { limit: PER_HOUR, windowMs: 3600_000 }))) return reply(429, { error: 'rate_limited' });

  let body = {};
  try { body = await req.json(); } catch { /* the body is optional */ }
  const pushToken = typeof body?.pushToken === 'string' && PUSH_TOKEN_RE.test(body.pushToken.trim()) ? body.pushToken.trim() : '';

  try {
    const privateKey = deps.privateKey ?? process.env.LINK_PRIVATE_KEY, kid = deps.kid ?? process.env.LINK_KEY_ID;
    if (privateKey && kid) {      // not configured = the AskFrankie link was never set up on this site, so there is no linked account to delete
      const jws = signLinkToken({ email: session.email, purpose: 'delete', privateKey, kid });
      const res = await (deps.fetch ?? fetch)(`${deps.askfrankieBase ?? ASKFRANKIE_API}/api/auth/link-delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: jws }) });
      if (res.status !== 200) return reply(502, { error: 'try_again' });
    }
    await (deps.clearOtp ?? clearOtpRecord)(session.email);
    if (pushToken) await (deps.deletePush ?? ((t) => deleteKey('qf-push-tokens', t)))(pushToken);
    await S.deleteAllForEmail(session.email, token);
  } catch {
    return reply(502, { error: 'try_again' });
  }
  return reply(200, { ok: true });
};
