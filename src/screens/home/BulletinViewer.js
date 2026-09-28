import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../theme';
import { useNetwork } from '../../context/NetworkContext';
import BackHeader from '../../components/BackHeader';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const SITE_BASE_URL = 'https://www.quitefrankly.tv';

function isMailto(url) {
  return url.startsWith('mailto:');
}

function isUnsubscribeLink(url) {
  return /unsubscribe/i.test(url);
}

function isNewsletterContentLink(url) {
  return url.startsWith(`${SITE_BASE_URL}/newsletter-content/`);
}

function isCampaignPageLink(url) {
  return url.startsWith(`${SITE_BASE_URL}/campaigns/`);
}

function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

// Best-effort: hides the campaign's footer/unsubscribe block and forces a
// dark-friendly background/link color to match the app's theme. Selectors
// are a generic guess at common footer/unsubscribe markup (class/id
// containing "footer"/"unsubscribe", plus any element linking to an
// unsubscribe URL) -- NOT verified against the real rendered campaign
// page, since the spike (2026-09-28) deliberately avoided fetching a
// campaign page directly (429s on repeated hits). Confirm this visually
// against a real bulletin on first on-device open; adjust selectors here
// if the real footer markup doesn't match.
const injectedJavaScript = `
(function () {
  var style = document.createElement('style');
  style.innerHTML = [
    'html, body { background: ${colors.surfaceGround} !important; color: ${colors.inkPrimary} !important; }',
    'a { color: ${colors.accentGold} !important; }',
    '.footer, [class*="footer" i], [id*="footer" i],',
    '[href*="unsubscribe" i], [class*="unsubscribe" i], [id*="unsubscribe" i]',
    '{ display: none !important; }'
  ].join(' ');
  document.head.appendChild(style);
})();
true;
`;

export default function BulletinViewer({ navigation, route }) {
  const bulletin = route?.params?.bulletin ?? {};
  const { isConnected } = useNetwork();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const resolvingUrlRef = useRef(null);

  const retry = () => {
    setError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // A newsletter-content link inside the bulletin's body only carries a
  // URL, not the post id Article needs to fetch its body -- resolve it via
  // get-newsletter-items's findByUrl mode first. On no match / a failed
  // lookup, fall back to the system browser rather than leaving the tap
  // silently doing nothing.
  const resolveAndOpenArticle = async (url) => {
    if (resolvingUrlRef.current === url) return; // guard against a double-fire
    resolvingUrlRef.current = url;
    try {
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-newsletter-items?mode=findByUrl&url=${encodeURIComponent(url)}`);
      const data = response.ok ? await response.json() : { post: null };
      if (data.post) {
        navigation.navigate('Article', { post: data.post, source: 'newsletter' });
      } else {
        WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' });
      }
    } catch {
      WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' });
    } finally {
      resolvingUrlRef.current = null;
    }
  };

  const handleShouldStartLoad = (request) => {
    const { url } = request;
    if (isMailto(url) || isUnsubscribeLink(url)) return false;
    if (isNewsletterContentLink(url)) {
      resolveAndOpenArticle(url);
      return false;
    }
    if (isCampaignPageLink(url)) return true;
    if (isHttpUrl(url)) {
      WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' });
      return false;
    }
    return false; // unrecognized scheme (tel:, sms:, etc.) -- block rather than silently attempt to load
  };

  return (
    <View style={styles.container}>
      <BackHeader title={bulletin.title || 'Bulletin'} navigation={navigation} />
      <View style={styles.webviewWrap}>
        {!isConnected ? (
          <ErrorState message="You're offline -- connect and try again." onRetry={retry} />
        ) : error ? (
          <ErrorState message="Couldn't load this bulletin." onRetry={retry} />
        ) : (
          <>
            <WebView
              key={reloadKey}
              source={{ uri: bulletin.url }}
              style={styles.webview}
              injectedJavaScript={injectedJavaScript}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onLoadEnd={() => setLoading(false)}
              onError={() => setError(true)}
              onHttpError={() => setError(true)}
            />
            {loading ? <LoadingState message="Loading bulletin…" style={styles.loadingOverlay} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  webviewWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceGround,
  },
});
