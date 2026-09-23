import { createContext, useContext, useEffect, useState } from 'react';
import { XMLParser } from 'fast-xml-parser';

const CHANNEL_ID = 'UCtB5nbKHYsX8EGIk9cOevaQ';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
});

function normalizeEntry(entry) {
  const id = entry.videoId;
  const thumbnail = entry.group?.thumbnail;
  return {
    id,
    title: entry.title,
    publishedAt: entry.published,
    thumbnailUrl: thumbnail?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

const YouTubeFeedContext = createContext({
  mostRecent: null,
  gridItems: [],
  loading: true,
  error: null,
});

export function YouTubeFeedProvider({ children }) {
  const [state, setState] = useState({ mostRecent: null, gridItems: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
        const xml = await response.text();
        const parsed = parser.parse(xml);
        const entries = parsed.feed?.entry ?? [];
        const items = (Array.isArray(entries) ? entries : [entries]).map(normalizeEntry);
        if (!cancelled) {
          setState({
            mostRecent: items[0] ?? null,
            gridItems: items.slice(1, 15),
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: error.message }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <YouTubeFeedContext.Provider value={state}>
      {children}
    </YouTubeFeedContext.Provider>
  );
}

export function useYouTubeFeed() {
  return useContext(YouTubeFeedContext);
}
