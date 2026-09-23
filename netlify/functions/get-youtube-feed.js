import { getJSON } from './lib/blobs.js';

export default async () => {
  const feed = await getJSON('qf-youtube-cache', 'feed', {
    mostRecent: null,
    gridItems: [],
    updatedAt: null,
  });

  return new Response(JSON.stringify(feed), {
    headers: { 'Content-Type': 'application/json' },
  });
};
