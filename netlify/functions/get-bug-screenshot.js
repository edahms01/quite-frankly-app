import { blobStore } from './lib/blobs.js';

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const store = blobStore('qf-bug-screenshots');
  const result = await store.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!result) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(result.data, {
    headers: { 'Content-Type': result.metadata?.contentType || 'application/octet-stream' },
  });
};
