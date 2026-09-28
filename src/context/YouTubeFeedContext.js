import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// gridItems isn't part of this state — Watch.js reads straight from the
// archive (get-youtube-episodes.js), not this RSS-poll cache; mostRecent
// stays here because Home.js's "Most Recent" card still needs it.
const YouTubeFeedContext = createContext({
  mostRecent: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

export function YouTubeFeedProvider({ children }) {
  const [state, setState] = useState({ mostRecent: null, loading: true, error: null });
  const mountedRef = useRef(true);

  const fetchFeed = useCallback(async ({ silent = false } = {}) => {
    if (!silent && mountedRef.current) {
      setState((prev) => ({ ...prev, loading: true }));
    }
    try {
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-youtube-feed`);
      if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
      const feed = await response.json();
      if (mountedRef.current) {
        setState({ mostRecent: feed.mostRecent, loading: false, error: null });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, loading: false, error: error.message }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFeed();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchFeed]);

  return (
    <YouTubeFeedContext.Provider value={{ ...state, refetch: () => fetchFeed({ silent: true }) }}>
      {children}
    </YouTubeFeedContext.Provider>
  );
}

export function useYouTubeFeed() {
  return useContext(YouTubeFeedContext);
}
