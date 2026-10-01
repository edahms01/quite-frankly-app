import { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const POLL_INTERVAL_MS = 180000; // 3 min — see plan doc for quota reasoning

const LiveStatusContext = createContext({ isLive: false, loading: true, error: null });

// One app-wide poll instead of one per useLiveStatus() caller — Home's
// "LIVE NOW" pill and the ON AIR badge used to each run their own fetch and
// state, so a single failed/late poll could leave them disagreeing on screen.
// Lives above NavigationContainer, so it gates polling on AppState (foreground
// only) rather than screen focus, and refetches immediately on foreground.
export function LiveStatusProvider({ children }) {
  const [status, setStatus] = useState({ isLive: false, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const checkLive = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-live-status`);
        if (!response.ok) throw new Error(`Live status request failed: ${response.status}`);
        const data = await response.json();
        if (!cancelled) setStatus({ isLive: data.isLive, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setStatus((prev) => ({ ...prev, loading: false, error: error.message }));
      }
    };

    const start = () => {
      if (intervalId) return;
      checkLive();
      intervalId = setInterval(checkLive, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (next) => (next === 'active' ? start() : stop()));

    return () => {
      cancelled = true;
      stop();
      sub.remove();
    };
  }, []);

  return <LiveStatusContext.Provider value={status}>{children}</LiveStatusContext.Provider>;
}

export function useLiveStatus() {
  return useContext(LiveStatusContext);
}
