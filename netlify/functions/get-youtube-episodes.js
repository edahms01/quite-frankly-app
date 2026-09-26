import { getJSON } from './lib/blobs.js';

const DEFAULT_LIMIT = 20;

export default async (req) => {
  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || DEFAULT_LIMIT));

  const all = await getJSON('qf-youtube-archive', 'episodes', []);
  const page = all.slice(offset, offset + limit);

  return new Response(
    JSON.stringify({
      episodes: page,
      total: all.length,
      hasMore: offset + page.length < all.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
