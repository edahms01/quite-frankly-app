import crypto from 'node:crypto';

// The signed token the app backend gives the AskFrankie site (Stage 5c). Compact JWS, EdDSA (Ed25519), no dependency. The PRIVATE key (LINK_PRIVATE_KEY, base64 of
// PKCS8 DER) exists only on this site; AskFrankie holds the public key. Claims must match the pipeline's verifier (ask-frankie-pipeline src/auth/link.ts):
//   header {alg:"EdDSA", typ:"JWT", kid}   payload {iss:"qf-app", aud:"askfrankie", purpose:"login"|"delete", email, email_verified:true, iat, exp, jti}
// The email passed in MUST come from a stored, verified session, never from the request.
export const ISS = 'qf-app';
export const AUD = 'askfrankie';
export const LIFETIME_S = 60;

const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');

export function signLinkToken({ email, purpose, privateKey, kid, now = Date.now(), jti = crypto.randomBytes(16).toString('base64url') }) {
  if (purpose !== 'login' && purpose !== 'delete') throw new Error('purpose must be login or delete');
  if (!email || !privateKey || !kid) throw new Error('email, privateKey and kid are required');
  const key = typeof privateKey === 'string' ? crypto.createPrivateKey({ key: Buffer.from(privateKey, 'base64'), format: 'der', type: 'pkcs8' }) : privateKey;
  const iat = Math.floor(now / 1000);
  const data = `${enc({ alg: 'EdDSA', typ: 'JWT', kid })}.${enc({ iss: ISS, aud: AUD, purpose, email, email_verified: true, iat, exp: iat + LIFETIME_S, jti })}`;
  return `${data}.${crypto.sign(null, Buffer.from(data), key).toString('base64url')}`;
}
