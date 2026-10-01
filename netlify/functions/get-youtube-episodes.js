import { getJSON } from './lib/blobs.js';

const DEFAULT_LIMIT = 20;

// Archive-only fields (stored for a later Supabase copy). The app doesn't read
// them, so they are stripped from the response to keep the payload identical to
// before. scheduledStartTime is deliberately NOT here: it already passed
// through and is load-bearing elsewhere.
const ARCHIVE_ONLY_KEYS = [
  'startedAt',
  'endedAt',
  'viewCount',
  'likeCount',
  'commentCount',
  'tags',
  'categoryId',
  'privacyStatus',
  'liveBroadcastContent',
  'defaultAudioLanguage',
];

export function stripArchiveOnlyKeys(episode) {
  const out = { ...episode };
  for (const key of ARCHIVE_ONLY_KEYS) delete out[key];
  return out;
}

// `getJSONFn` is a test seam (default: the real blob read).
export function createHandler({ getJSONFn = getJSON } = {}) {
  return async (req) => {
    const url = new URL(req.url);
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || DEFAULT_LIMIT));

    const all = await getJSONFn('qf-youtube-archive', 'episodes', []);
    const page = all.slice(offset, offset + limit).map(stripArchiveOnlyKeys);

    return new Response(
      JSON.stringify({
        episodes: page,
        total: all.length,
        hasMore: offset + page.length < all.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  };
}

export default createHandler();
