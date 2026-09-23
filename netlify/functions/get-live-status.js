import { getJSON } from './lib/blobs.js';

export default async () => {
  const status = await getJSON('qf-live-status', 'status', { isLive: false, checkedAt: null });
  return new Response(JSON.stringify(status), {
    headers: { 'Content-Type': 'application/json' },
  });
};
