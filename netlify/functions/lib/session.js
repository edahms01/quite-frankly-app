import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

// App sessions (written by verify-code.js). Stage 5c: an EMAIL INDEX so every session of an address can be found and deleted (account deletion), built going
// forward only: sessions written before this existed are NOT indexed (the app has no real users yet; "reset dev data" clears them). Keys never contain a raw email:
//   qf-sessions/<token>        { email, createdAt }                 (token = 32 random bytes, hex)
//   qf-session-index/<sha256(email)>  { tokens: [token, ...] }     (newest last, at most MAX_SESSIONS: the oldest is revoked when a new one is added)
// Blobs have no transactions: two simultaneous sign-ins of one address could lose an index entry (an unindexed session). deleteAllForEmail also deletes the
// session it was called with, and a leftover unindexed session expires with "reset dev data" / is bounded by the 180-day link-token age rule.
export const SESSIONS = 'qf-sessions';
export const INDEX = 'qf-session-index';
export const MAX_SESSIONS = 20;
export const TOKEN_RE = /^[a-f0-9]{64}$/;

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
export const emailKey = (email) => crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex');

/** `storeFor(name)` returns a Blobs-like store ({ get(key,{type}), setJSON, delete }); tests inject an in-memory one. */
export function createSessions(storeFor = getStore, now = () => Date.now()) {
  const read = (name, key) => storeFor(name).get(key, { type: 'json' });
  const write = (name, key, value) => storeFor(name).setJSON(key, value);
  const remove = (name, key) => storeFor(name).delete(key);

  async function createSession(email) {
    const e = normalizeEmail(email);
    const token = crypto.randomBytes(32).toString('hex');
    await write(SESSIONS, token, { email: e, createdAt: new Date(now()).toISOString() });
    const key = emailKey(e);
    const idx = (await read(INDEX, key)) ?? { tokens: [] };
    const tokens = [...(Array.isArray(idx.tokens) ? idx.tokens : []), token];
    while (tokens.length > MAX_SESSIONS) await remove(SESSIONS, tokens.shift());
    await write(INDEX, key, { tokens });
    return token;
  }

  /** { email, createdAt, ageDays } for a live session, else null. A malformed token never reaches the store. */
  async function getSession(token) {
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
    const s = await read(SESSIONS, token);
    if (!s || typeof s.email !== 'string' || !s.email) return null;
    const created = Date.parse(s.createdAt);
    return { email: s.email, createdAt: s.createdAt, ageDays: Number.isFinite(created) ? (now() - created) / 86400000 : Infinity };
  }

  /** Sign out: delete the session and drop it from the index. Idempotent. */
  async function revokeSession(token) {
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) return;
    const s = await read(SESSIONS, token);
    await remove(SESSIONS, token);
    if (s?.email) {
      const key = emailKey(s.email);
      const idx = await read(INDEX, key);
      if (idx && Array.isArray(idx.tokens)) {
        const tokens = idx.tokens.filter((t) => t !== token);
        if (tokens.length) await write(INDEX, key, { tokens }); else await remove(INDEX, key);
      }
    }
  }

  /** Account deletion: every indexed session of the address, the index itself, and (always) the session that made the request. Returns how many sessions were removed. */
  async function deleteAllForEmail(email, currentToken) {
    const key = emailKey(email);
    const idx = await read(INDEX, key);
    const tokens = new Set(Array.isArray(idx?.tokens) ? idx.tokens : []);
    if (typeof currentToken === 'string' && TOKEN_RE.test(currentToken)) tokens.add(currentToken);
    for (const t of tokens) if (TOKEN_RE.test(t)) await remove(SESSIONS, t);
    await remove(INDEX, key);
    return tokens.size;
  }

  return { createSession, getSession, revokeSession, deleteAllForEmail };
}

export const sessions = createSessions();

/** The Bearer token of a request, or ''. */
export function bearerToken(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '');
  return m ? m[1] : '';
}
