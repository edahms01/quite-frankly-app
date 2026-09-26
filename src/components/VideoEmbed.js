import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import LoadingState from './LoadingState';

// The YouTube embed + Referer-header pattern verified against real playback
// in VideoPlayer.js — reused verbatim here so Home's inline card and
// VideoPlayer.js share one implementation.
//
// width/height are required, explicit numbers given directly to the
// WebView's style (not flex/percentage/absoluteFill sizing, and not a
// value derived from measuring this component's own parent). WebView is a
// native-bridged component, not a plain Yoga-measured View — in a deeper/
// heavier tree (Home's card: SafeAreaView > ScrollView > TouchableOpacity
// > this) both relative sizing and self-measurement-then-mount were
// observed to still resolve to the wrong width, while the exact same
// relative styling works fine one level shallower (VideoPlayer.js's plain
// ScrollView > View). A literal number requires no resolution step at
// all, sidestepping that native measurement race entirely. Callers
// compute these from useWindowDimensions.
export default function VideoEmbed({ videoId, width, height, onLoadEnd }) {
  const [loading, setLoading] = useState(true);

  const handleLoadEnd = () => {
    setLoading(false);
    onLoadEnd?.();
  };

  return (
    <View style={{ width, height }}>
      <WebView
        source={{
          uri: `https://www.youtube.com/embed/${videoId}`,
          headers: { Referer: 'https://www.quitefrankly.tv' },
        }}
        style={{ width, height, backgroundColor: 'transparent' }}
        allowsInlineMediaPlayback
        onLoadEnd={handleLoadEnd}
      />
      {loading ? <LoadingState message="Loading video…" style={styles.loading} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
