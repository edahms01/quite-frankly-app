import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { FLAG_DEFAULTS, applyOverride, isEnabled, normalizeFlags, parseCachedFlags } from '../lib/featureFlags';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const CACHE_KEY = 'qf_flags_cache';
const FETCH_TIMEOUT_MS = 8000;
const HYDRATE_TIMEOUT_MS = 1500;
// Dev builds only (never a release build): force flags locally, e.g. EXPO_PUBLIC_FLAGS_OVERRIDE='{"accounts":true}', so screenshots and tests
// never flip a live flag (the flags store is site-wide).
const DEV_OVERRIDE = typeof __DEV__ !== 'undefined' && __DEV__ ? process.env.EXPO_PUBLIC_FLAGS_OVERRIDE : undefined;

export { FLAG_DEFAULTS };

// Remote feature flags (netlify/functions/get-feature-flags.js). Everything is OFF until the server says otherwise. The last fetched value is cached
// in AsyncStorage and read before the first screen renders, so an offline start uses the last known flags (or OFF on a first run). A failed or slow
// request keeps whatever we have and never throws. No app release is needed to flip one. Fetched at launch and every time the app returns to the foreground.
const FeatureFlagsContext = createContext({ flags: FLAG_DEFAULTS, loaded: false });

export function FeatureFlagsProvider({ children }) {
  const [server, setServer] = useState(FLAG_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const gotNetwork = useRef(false);

  useEffect(() => {          // 1) the cached value, before the first real screen
    let cancelled = false;
    const done = () => { if (!cancelled) setHydrated(true); };
    const timer = setTimeout(done, HYDRATE_TIMEOUT_MS);
    AsyncStorage.getItem(CACHE_KEY)
      .then((text) => { if (!cancelled && !gotNetwork.current) setServer(parseCachedFlags(text)); })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); done(); });
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {          // 2) the network, at launch and on every foreground
    let cancelled = false;
    const load = async () => {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
      try {
        const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-feature-flags`, controller ? { signal: controller.signal } : undefined);
        if (!response.ok) throw new Error(`flags ${response.status}`);
        const flags = normalizeFlags(await response.json());
        gotNetwork.current = true;
        if (!cancelled) setServer(flags);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(flags)).catch(() => {});
      } catch {
        // keep the cached / previous value
      } finally {
        if (timer) clearTimeout(timer);
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    const sub = AppState.addEventListener('change', (next) => { if (next === 'active') load(); });
    return () => { cancelled = true; sub.remove(); };
  }, []);

  const flags = useMemo(() => applyOverride(server, DEV_OVERRIDE), [server]);
  const value = useMemo(() => ({ flags, loaded }), [flags, loaded]);

  // A few milliseconds of the app's own background while the cached flags are read, so the first screen is already the right one.
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

/** The flags object ({ accounts, cultureClub, askfrankie_enabled, ... }). */
export function useFeatureFlags() {
  return useContext(FeatureFlagsContext).flags;
}

/** The one helper screens use: `const isEnabled = useIsEnabled(); if (isEnabled('accounts')) ...` */
export function useIsEnabled() {
  const { flags } = useContext(FeatureFlagsContext);
  return useCallback((name) => isEnabled(flags, name), [flags]);
}
