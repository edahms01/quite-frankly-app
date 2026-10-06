import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../theme';
import { useNetwork } from '../../context/NetworkContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import BackHeader from '../../components/BackHeader';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { APP_UA_NAME, ASKFRANKIE_ORIGIN, ASKFRANKIE_URL } from '../../config/askfrankie';
import { classifyRequest, linkInjection, parsePageMessage } from '../../lib/askfrankieNav';
import { fetchLinkToken, getStoredEmail } from '../../lib/account';

// AskFrankie inside the app: the product site in a WebView (page opens in app layout: "?app=1" + the QFApp/ user agent). The page tells us when it has loaded
// ("ready", and whether it is signed in); a signed-in app user is then handed a short-lived signed login token so they never see a second sign-in. The token goes
// ONLY through injected JavaScript after load (never in a URL, never stored or logged here). On ANY failure the page shows its normal code sign-in and we just
// prefill the email (a hint: it may be unverified, the code is still required).
export default function AskFrankie({ navigation }) {
  const { isConnected } = useNetwork();
  const { askfrankie_linked_login: linkedLoginOn } = useFeatureFlags();
  const webRef = useRef(null);
  const canGoBackRef = useRef(false);
  const suppressRelinkRef = useRef(false);   // the person signed out or deleted inside the page: do not sign them straight back in during this visit
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = () => { setError(false); setLoading(true); setReloadKey((k) => k + 1); };

  // Android hardware back: step back inside the page first, leave the screen when there is nothing left to go back to.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current && webRef.current) { webRef.current.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);

  const handshake = useCallback(async () => {
    const email = (await getStoredEmail().catch(() => null)) || '';
    const linkToken = linkedLoginOn && !suppressRelinkRef.current ? await fetchLinkToken() : null;
    let detail = null;
    if (linkToken) detail = { type: 'link', token: linkToken, ...(email ? { email } : {}) };
    else if (email) detail = { type: 'prefill', email };
    if (detail && webRef.current) webRef.current.injectJavaScript(linkInjection(detail));
  }, [linkedLoginOn]);

  const onMessage = (event) => {
    const { data, url } = event.nativeEvent;
    const msg = parsePageMessage(data, url, ASKFRANKIE_ORIGIN);      // only the chat origin, only the three fixed message types
    if (!msg) return;
    if (msg.type === 'deleted' || msg.type === 'signedOut') { suppressRelinkRef.current = true; return; }
    if (msg.type === 'ready' && !msg.signedIn) handshake();
  };

  const onShouldStart = (request) => {
    const action = classifyRequest(request.url, ASKFRANKIE_ORIGIN);
    if (action === 'stay') return true;
    if (action === 'external') WebBrowser.openBrowserAsync(request.url, { dismissButtonStyle: 'close' });
    else if (action === 'system') Linking.openURL(request.url).catch(() => {});
    return false;
  };

  return (
    <View style={styles.container}>
      <BackHeader title="AskFrankie AI" navigation={navigation} hideAvatar />
      <View style={styles.webviewWrap}>
        {!isConnected ? (
          <ErrorState message="You're offline -- connect and try again." onRetry={retry} />
        ) : error ? (
          <ErrorState message="Couldn't load AskFrankie." onRetry={retry} />
        ) : (
          <>
            <WebView
              key={reloadKey}
              ref={webRef}
              source={{ uri: ASKFRANKIE_URL }}
              style={styles.webview}
              applicationNameForUserAgent={APP_UA_NAME}
              onShouldStartLoadWithRequest={onShouldStart}
              onOpenWindow={(e) => { const u = e.nativeEvent.targetUrl; if (classifyRequest(u, ASKFRANKIE_ORIGIN) === 'external') WebBrowser.openBrowserAsync(u, { dismissButtonStyle: 'close' }); }}
              onMessage={onMessage}
              onNavigationStateChange={(s) => { canGoBackRef.current = s.canGoBack; }}
              onLoadEnd={() => setLoading(false)}
              onError={() => setError(true)}
              onHttpError={() => setError(true)}
              onContentProcessDidTerminate={() => webRef.current?.reload()}
              domStorageEnabled
              cacheEnabled
              sharedCookiesEnabled
              incognito={false}
              allowFileAccess={false}
              allowFileAccessFromFileURLs={false}
              allowUniversalAccessFromFileURLs={false}
              allowsBackForwardNavigationGestures
              pullToRefreshEnabled={false}
              bounces={false}
              textZoom={100}
              contentInsetAdjustmentBehavior="never"
              setSupportMultipleWindows
              mixedContentMode="never"
            />
            {loading ? <LoadingState message="Loading AskFrankie…" style={styles.loadingOverlay} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceGround },
  webviewWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.surfaceGround },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceGround,
  },
});
