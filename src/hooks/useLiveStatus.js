import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const POLL_INTERVAL_MS = 180000; // 3 min — see plan doc for quota reasoning

export function useLiveStatus() {
  const isFocused = useIsFocused();
  const [status, setStatus] = useState({ isLive: false, loading: true, error: null });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isFocused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let cancelled = false;
    const checkLive = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-live-status`);
        if (!response.ok) throw new Error(`Live status request failed: ${response.status}`);
        const data = await response.json();
        if (!cancelled) {
          setStatus({ isLive: data.isLive, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus((prev) => ({ ...prev, loading: false, error: error.message }));
        }
      }
    };

    checkLive();
    intervalRef.current = setInterval(checkLive, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isFocused]);

  return status;
}
