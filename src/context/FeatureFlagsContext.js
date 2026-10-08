import { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Remote feature flags (netlify/functions/get-feature-flags.js). Everything is OFF until the server says otherwise, a failed request keeps the last known
// value (or OFF), and no app release is needed to flip one. Fetched at launch and every time the app returns to the foreground.
export const FLAG_DEFAULTS = { askfrankie_enabled: false, askfrankie_linked_login: false };

const FeatureFlagsContext = createContext({ flags: FLAG_DEFAULTS, loaded: false });

export function FeatureFlagsProvider({ children }) {
  const [state, setState] = useState({ flags: FLAG_DEFAULTS, loaded: false });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-feature-flags`);
        if (!response.ok) throw new Error(`flags ${response.status}`);
        const data = await response.json();
        const flags = {};
        for (const k of Object.keys(FLAG_DEFAULTS)) flags[k] = data?.[k] === true;
        if (!cancelled) setState({ flags, loaded: true });
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, loaded: true }));
      }
    };
    load();
    const sub = AppState.addEventListener('change', (next) => { if (next === 'active') load(); });
    return () => { cancelled = true; sub.remove(); };
  }, []);

  return <FeatureFlagsContext.Provider value={state}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext).flags;
}
