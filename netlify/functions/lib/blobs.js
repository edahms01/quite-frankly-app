import { getStore } from '@netlify/blobs';

export async function getJSON(storeName, key, fallback = null) {
  const store = getStore(storeName);
  const value = await store.get(key, { type: 'json' });
  return value ?? fallback;
}

export async function setJSON(storeName, key, value) {
  const store = getStore(storeName);
  await store.setJSON(key, value);
}

export async function deleteKey(storeName, key) {
  const store = getStore(storeName);
  await store.delete(key);
}

export function blobStore(storeName) {
  return getStore(storeName);
}
