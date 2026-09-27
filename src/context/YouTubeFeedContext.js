import { createContext, useContext, useEffect, useState } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// gridItems isn't part of this state — Watch.js reads straight from the
// archive (get-youtube-episodes.js), not this RSS-poll cache; mostRecent
// stays here because Home.js's "Most Recent" card still needs it.
const YouTubeFeedContext = createContext({
  mostRecent: null,
  loading: true,
  error: null,
});

export function YouTubeFeedProvider({ children }) {
  const [state, setState] = useState({ mostRecent: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-youtube-feed`);
        if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
        const feed = await response.json();
        if (!cancelled) {
          setState({
            mostRecent: feed.mostRecent,
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
