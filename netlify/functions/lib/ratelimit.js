import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

// A small fixed-window counter in Blobs (`qf-rate/<sha256(key)>`), enough to bound abuse of the link and deletion endpoints. Not atomic (Blobs have no
// transactions), so a burst of simultaneous requests can slip a few extra through; that is fine for these limits. The key is hashed: no token or email is stored.
export async function allow(key, { limit, windowMs, now = Date.now(), storeFor = getStore }) {
  const store = storeFor('qf-rate');
  const k = crypto.createHash('sha256').update(String(key)).digest('hex');
  let rec = null;
  try { rec = await store.get(k, { type: 'json' }); } catch { /* treat as no record */ }
  if (!rec || typeof rec.start !== 'number' || now - rec.start >= windowMs) rec = { start: now, count: 0 };
  if (rec.count >= limit) return false;
  rec.count += 1;
  await store.setJSON(k, rec);
  return true;
}
