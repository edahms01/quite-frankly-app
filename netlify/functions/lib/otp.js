import crypto from 'node:crypto';
import { getJSON, setJSON, deleteKey } from './blobs.js';

const STORE = 'qf-otp';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

export function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export async function getOtpRecord(email) {
  return getJSON(STORE, email, null);
}

export async function setOtpRecord(email, record) {
  await setJSON(STORE, email, record);
}

export async function clearOtpRecord(email) {
  await deleteKey(STORE, email);
}
