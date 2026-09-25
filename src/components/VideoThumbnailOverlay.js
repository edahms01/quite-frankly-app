import { Image, StyleSheet, View } from 'react-native';
import { CirclePlay } from 'lucide-react-native';
import { colors } from '../theme';

// Purely presentational "not currently playing" state — thumbnail image +
// centered play button. Shared by Home's inline card and VideoPlayer.js so
// both screens use one "tap to play" visual. Callers own the touch handler
// (wrap this in their own TouchableOpacity) and the container's size/background.
export default function VideoThumbnailOverlay({ thumbnailUrl }) {
  return (
    <View style={styles.container}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      <View style={styles.playButton}>
        <CirclePlay color={colors.inkPrimary} size={28} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
