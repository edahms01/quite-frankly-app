import { createContext, useContext, useEffect, useState } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

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
        const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-youtube-feed`);
        if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
        const feed = await response.json();
        if (!cancelled) {
          setState({
            mostRecent: feed.mostRecent,
            gridItems: feed.gridItems,
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
