import { bearerToken, sessions } from './lib/session.js';
import { readFlags } from './lib/flags.js';
import { signLinkToken } from './lib/linktoken.js';
import { allow } from './lib/ratelimit.js';

// POST, Authorization: Bearer <app session token>. Returns { token }: a 60-second Ed25519-signed login token for AskFrankie (see lib/linktoken.js). The email is read
// from the STORED session only (the request body is never read). Off unless BOTH remote flags are on. A token or an email is never logged.
const MAX_SESSION_AGE_DAYS = Number(process.env.LINK_MAX_SESSION_AGE_DAYS) > 0 ? Number(process.env.LINK_MAX_SESSION_AGE_DAYS) : 180;
const PER_HOUR = 6;

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req, _ctx, deps = {}) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const flags = await (deps.readFlags ?? readFlags)();
  if (!flags.askfrankie_enabled || !flags.askfrankie_linked_login) return reply(404, { error: 'disabled' });
  const privateKey = deps.privateKey ?? process.env.LINK_PRIVATE_KEY, kid = deps.kid ?? process.env.LINK_KEY_ID;
  if (!privateKey || !kid) return reply(503, { error: 'unavailable' });

  const token = bearerToken(req);
  const session = await (deps.sessions ?? sessions).getSession(token);
  if (!session) return reply(401, { error: 'unauthorized' });
  if (session.ageDays > MAX_SESSION_AGE_DAYS) return reply(401, { error: 'unauthorized' });   // an old session falls back to the code sign-in inside AskFrankie
  if (!(await (deps.allow ?? allow)(`link:${token}`, { limit: PER_HOUR, windowMs: 3600_000 }))) return reply(429, { error: 'rate_limited' });

  try {
    return reply(200, { token: signLinkToken({ email: session.email, purpose: 'login', privateKey, kid }) });
  } catch {
    return reply(503, { error: 'unavailable' });
  }
};
