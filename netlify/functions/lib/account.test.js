import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createSessions, emailKey, INDEX, MAX_SESSIONS, SESSIONS } from './session.js';
import { signLinkToken } from './linktoken.js';
import { normalizeFlags } from './flags.js';
import linkFn from '../askfrankie-link.js';
import deleteFn from '../delete-account.js';
import signOutFn from '../sign-out.js';

// In-memory stand-in for Netlify Blobs: storeFor(name) -> { get, setJSON, delete }.
function memory() {
  const stores = new Map();
  const storeFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return { get: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), setJSON: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async (k) => { m.delete(k); } };
  };
  return { storeFor, keys: (name) => [...(stores.get(name)?.keys() ?? [])], raw: (name, k) => stores.get(name)?.get(k) };
}
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const PRIV = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const decode = (jws) => { const [h, p, s] = jws.split('.'); return { header: JSON.parse(Buffer.from(h, 'base64url')), payload: JSON.parse(Buffer.from(p, 'base64url')), valid: crypto.verify(null, Buffer.from(`${h}.${p}`), publicKey, Buffer.from(s, 'base64url')) }; };
const post = (token, body) => new Request('https://x.test/fn', { method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const A = 'test-a@test.invalid', B = 'test-b@test.invalid';

test('email index: every session of an address is indexed; the index key is a hash, never the email', async () => {
  const m = memory(), S = createSessions(m.storeFor);
  const t1 = await S.createSession(` ${A.toUpperCase()} `), t2 = await S.createSession(A), tb = await S.createSession(B);
  assert.deepEqual(m.raw(INDEX, emailKey(A)).tokens, [t1, t2]);
  assert.equal(m.keys(INDEX).some((k) => k.includes('@')), false);
  assert.equal((await S.getSession(t1)).email, A);
  assert.deepEqual(m.raw(INDEX, emailKey(B)).tokens, [tb]);
});

test('getSession: malformed, unknown and young/old sessions', async () => {
  const m = memory(); let now = Date.parse('2026-10-06T00:00:00Z');
  const S = createSessions(m.storeFor, () => now);
  const t = await S.createSession(A);
  for (const bad of ['', 'abc', null, undefined, 5, 'g'.repeat(64), 'A'.repeat(64)]) assert.equal(await S.getSession(bad), null);
  assert.equal(await S.getSession('a'.repeat(64)), null);
  now += 200 * 86400000;
  assert.ok((await S.getSession(t)).ageDays > 199);
});

test('the oldest session is revoked when an address passes the cap', async () => {
  const m = memory(), S = createSessions(m.storeFor);
  const first = await S.createSession(A);
  for (let i = 0; i < MAX_SESSIONS; i++) await S.createSession(A);
  assert.equal(await S.getSession(first), null);
  assert.equal(m.raw(INDEX, emailKey(A)).tokens.length, MAX_SESSIONS);
});

test('sign-out: deletes that session and its index entry; idempotent; unknown token is still ok', async () => {
  const m = memory(), S = createSessions(m.storeFor);
  const t1 = await S.createSession(A), t2 = await S.createSession(A);
  const r1 = await signOutFn(post(t1), {}, { sessions: S });
  assert.equal(r1.status, 200);
  assert.equal(await S.getSession(t1), null);
  assert.ok(await S.getSession(t2));
  assert.deepEqual(m.raw(INDEX, emailKey(A)).tokens, [t2]);
  assert.equal((await signOutFn(post(t1), {}, { sessions: S })).status, 200);
  assert.equal((await signOutFn(post('nonsense'), {}, { sessions: S })).status, 200);
  assert.equal((await signOutFn(post(null), {}, { sessions: S })).status, 200);
  await signOutFn(post(t2), {}, { sessions: S });
  assert.equal(m.keys(INDEX).length, 0);
  assert.equal((await signOutFn(new Request('https://x.test/fn'), {}, { sessions: S })).status, 405);
});

const deleteDeps = (m, extra = {}) => {
  const calls = { fetch: [], otp: [], push: [] };
  return { calls, deps: { sessions: createSessions(m.storeFor), allow: async () => true, privateKey: PRIV, kid: 'k1', askfrankieBase: 'https://af.test',
    fetch: async (url, init) => { calls.fetch.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); },
    clearOtp: async (e) => { calls.otp.push(e); }, deletePush: async (t) => { calls.push.push(t); }, ...extra } };
};

test('delete-account: needs a session (401 otherwise); the email comes from the session, never from the body', async () => {
  const m = memory(), { deps, calls } = deleteDeps(m);
  assert.equal((await deleteFn(post(null, {}), {}, deps)).status, 401);
  assert.equal((await deleteFn(post('b'.repeat(64), {}), {}, deps)).status, 401);
  assert.equal(calls.fetch.length, 0);
  const t = await deps.sessions.createSession(A);
  const res = await deleteFn(post(t, { email: B, pushToken: 'ExponentPushToken[abc-123]' }), {}, deps);
  assert.equal(res.status, 200);
  assert.deepEqual(calls.otp, [A]);
  assert.equal(decode(calls.fetch[0].body.token).payload.email, A);
  assert.deepEqual(calls.push, ['ExponentPushToken[abc-123]']);
});

test('delete-account: removes every session of that address (and only that address), the OTP entry, then is idempotent', async () => {
  const m = memory(), { deps, calls } = deleteDeps(m);
  const a1 = await deps.sessions.createSession(A), a2 = await deps.sessions.createSession(A), b1 = await deps.sessions.createSession(B);
  assert.equal((await deleteFn(post(a1, {}), {}, deps)).status, 200);
  assert.equal(await deps.sessions.getSession(a1), null);
  assert.equal(await deps.sessions.getSession(a2), null);
  assert.ok(await deps.sessions.getSession(b1));
  assert.equal(m.raw(INDEX, emailKey(A)), undefined);
  assert.ok(m.raw(INDEX, emailKey(B)));
  assert.equal(m.keys(SESSIONS).length, 1);
  assert.equal((await deleteFn(post(a1, {}), {}, deps)).status, 401);           // deleting twice: the second finds no session; the client just clears itself
  assert.equal(calls.fetch.length, 1);
});

test('delete-account: the AskFrankie token is a DELETE-purpose token and cannot be a login token; push tokens must have the Expo shape', async () => {
  const m = memory(), { deps, calls } = deleteDeps(m);
  const t = await deps.sessions.createSession(A);
  await deleteFn(post(t, { pushToken: '../../qf-sessions/x' }), {}, deps);
  assert.deepEqual(calls.push, []);
  const d = decode(calls.fetch[0].body.token);
  assert.equal(d.valid, true);
  assert.deepEqual([d.header.alg, d.header.kid, d.payload.iss, d.payload.aud, d.payload.purpose, d.payload.email_verified], ['EdDSA', 'k1', 'qf-app', 'askfrankie', 'delete', true]);
  assert.ok(d.payload.exp - d.payload.iat <= 120);
  assert.equal(calls.fetch[0].url, 'https://af.test/api/auth/link-delete');
});

test('delete-account: if AskFrankie fails, NOTHING is deleted and the answer is try_again (retry works with the same session)', async () => {
  const m = memory();
  let status = 500;
  const { deps, calls } = deleteDeps(m, { fetch: async () => new Response('{}', { status }) });
  const t = await deps.sessions.createSession(A);
  for (const s of [500, 401, 404]) { status = s; const r = await deleteFn(post(t, {}), {}, deps); assert.equal(r.status, 502); assert.deepEqual(await r.json(), { error: 'try_again' }); }
  assert.ok(await deps.sessions.getSession(t));
  assert.deepEqual(calls.otp, []);
  const down = await deleteFn(post(t, {}), {}, { ...deps, fetch: async () => { throw new Error('network'); } });
  assert.equal(down.status, 502);
  assert.ok(await deps.sessions.getSession(t));
  status = 200;
  assert.equal((await deleteFn(post(t, {}), {}, deps)).status, 200);
  assert.equal(await deps.sessions.getSession(t), null);
});

test('delete-account: with no link key configured there is no AskFrankie link to delete, so only local data goes; rate limit answers 429', async () => {
  const m = memory(), { deps, calls } = deleteDeps(m, { privateKey: '', kid: '' });
  const t = await deps.sessions.createSession(A);
  assert.equal((await deleteFn(post(t, {}), {}, { ...deps, allow: async () => false })).status, 429);
  assert.ok(await deps.sessions.getSession(t));
  assert.equal((await deleteFn(post(t, {}), {}, deps)).status, 200);
  assert.equal(calls.fetch.length, 0);
  assert.equal((await deleteFn(new Request('https://x.test/fn'), {}, deps)).status, 405);
});

const linkDeps = (m, extra = {}) => ({ sessions: createSessions(m.storeFor), readFlags: async () => normalizeFlags({ askfrankie_enabled: true, askfrankie_linked_login: true }), privateKey: PRIV, kid: 'k1', allow: async () => true, ...extra });

test('link token: a LOGIN token for the session email (body ignored), valid signature, 60 s, purpose login', async () => {
  const m = memory(), deps = linkDeps(m);
  const t = await deps.sessions.createSession(A);
  const res = await linkFn(post(t, { email: B, purpose: 'delete' }), {}, deps);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const d = decode((await res.json()).token);
  assert.equal(d.valid, true);
  assert.deepEqual([d.payload.email, d.payload.purpose, d.payload.email_verified, d.payload.exp - d.payload.iat], [A, 'login', true, 60]);
  assert.ok(d.payload.jti.length >= 16);
  const again = decode((await (await linkFn(post(t), {}, deps)).json()).token);
  assert.notEqual(again.payload.jti, d.payload.jti);                           // a fresh single-use id every time
});

test('link token: off unless BOTH flags are true; 401 for no/unknown/old session; 429 over the limit; 503 without a key; GET is 405', async () => {
  const m = memory(), deps = linkDeps(m);
  const t = await deps.sessions.createSession(A);
  for (const f of [{}, { askfrankie_enabled: true }, { askfrankie_linked_login: true }, { askfrankie_enabled: 'true', askfrankie_linked_login: 1 }]) assert.equal((await linkFn(post(t), {}, { ...deps, readFlags: async () => normalizeFlags(f) })).status, 404);
  assert.equal((await linkFn(post(null), {}, deps)).status, 401);
  assert.equal((await linkFn(post('c'.repeat(64)), {}, deps)).status, 401);
  const old = { ...deps, sessions: { getSession: async () => ({ email: A, ageDays: 181 }) } };
  assert.equal((await linkFn(post(t), {}, old)).status, 401);
  assert.equal((await linkFn(post(t), {}, { ...deps, allow: async () => false })).status, 429);
  assert.equal((await linkFn(post(t), {}, { ...deps, privateKey: '' })).status, 503);
  assert.equal((await linkFn(new Request('https://x.test/fn'), {}, deps)).status, 405);
});

test('flags: defaults are off; only a literal true turns one on', () => {
  assert.deepEqual(normalizeFlags(null), { askfrankie_enabled: false, askfrankie_linked_login: false });
  assert.deepEqual(normalizeFlags({ askfrankie_enabled: 'yes', askfrankie_linked_login: true, extra: true }), { askfrankie_enabled: false, askfrankie_linked_login: true });
});

test('signLinkToken refuses a bad purpose and missing inputs', () => {
  assert.throws(() => signLinkToken({ email: A, purpose: 'admin', privateKey: PRIV, kid: 'k1' }));
  assert.throws(() => signLinkToken({ email: '', purpose: 'login', privateKey: PRIV, kid: 'k1' }));
});
