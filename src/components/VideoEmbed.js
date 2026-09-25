import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import LoadingState from './LoadingState';

// The YouTube embed + Referer-header pattern verified against real playback
// in VideoPlayer.js — reused verbatim here so Home's inline card and
// VideoPlayer.js share one implementation.
export default function VideoEmbed({ videoId, style, onLoadEnd }) {
  const [loading, setLoading] = useState(true);

  const handleLoadEnd = () => {
    setLoading(false);
    onLoadEnd?.();
  };

  return (
    <>
      <WebView
        source={{
          uri: `https://www.youtube.com/embed/${videoId}`,
          headers: { Referer: 'https://www.quitefrankly.tv' },
        }}
        style={[styles.webview, style]}
        allowsInlineMediaPlayback
        onLoadEnd={handleLoadEnd}
      />
      {loading ? <LoadingState message="Loading video…" style={styles.loading} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
