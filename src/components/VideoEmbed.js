import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
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

  // Without this, tapping things inside the embed (the video's own title/
  // channel link, an end-of-video suggestion, an ad clickthrough) lets the
  // WebView navigate its whole top frame away from the embed to a full
  // youtube.com page, which then fills this small embed-sized box —
  // looking "stuck" on that page since there's no way back to the video
  // grid from inside it. Only the iframe's internal (non-top-frame)
  // navigations are needed for actual playback to work; anything that
  // tries to navigate the top frame itself away from the embed is handed
  // to the OS instead.
  const handleShouldStartLoad = (request) => {
    if (!request.isTopFrame || request.url.startsWith('https://www.youtube.com/embed/')) {
      return true;
    }
    Linking.openURL(request.url);
    return false;
  };

  return (
    <View style={{ width, height }}>
      <WebView
        source={{
          uri: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`,
          headers: { Referer: 'https://www.quitefrankly.tv' },
        }}
        style={{ width, height, backgroundColor: 'transparent' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoadEnd={handleLoadEnd}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
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
