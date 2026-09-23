import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

const CHANNEL_ID = 'UCtB5nbKHYsX8EGIk9cOevaQ';
const POLL_INTERVAL_MS = 180000; // 3 min — see plan doc for quota reasoning

const YT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY_IOS,
  android: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY_ANDROID,
});

// SHA-1 of android/app/debug.keystore's androiddebugkey (extracted via
// `keytool -list -v`, no colons, lowercase). This is the cert every debug
// AND release build in this repo is signed with (build.gradle points
// release at signingConfigs.debug too) — a real production release
// keystore would need its own SHA-1 registered against the Android key
// in Cloud Console and swapped in here.
const ANDROID_DEBUG_CERT_SHA1 = '5e8f16062ea3cd2c4a0d547876baa6f38cabf625';

function buildHeaders() {
  if (Platform.OS === 'ios') {
    return { 'X-Ios-Bundle-Identifier': 'tv.quitefrankly.app' };
  }
  return {
    'X-Android-Package': 'tv.quitefrankly.app',
    'X-Android-Cert': ANDROID_DEBUG_CERT_SHA1,
  };
}

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
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;
        const response = await fetch(url, { headers: buildHeaders() });
        if (!response.ok) throw new Error(`Live status request failed: ${response.status}`);
        const data = await response.json();
        if (!cancelled) {
          setStatus({ isLive: (data.items?.length ?? 0) > 0, loading: false, error: null });
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
