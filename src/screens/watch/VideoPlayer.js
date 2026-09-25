import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';
import LoadingState from '../../components/LoadingState';

export default function VideoPlayer({ navigation, route }) {
  const video = route?.params?.video;
  const title = video?.title ?? '[Video title]';
  const youtubeUrl = video?.id
    ? `https://www.youtube.com/watch?v=${video.id}`
    : 'https://www.youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ';
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.playerArea}>
        <WebView
          source={{
            uri: `https://www.youtube.com/embed/${video.id}`,
            headers: { Referer: 'https://www.quitefrankly.tv' },
          }}
          style={styles.webview}
          allowsInlineMediaPlayback
          onLoadEnd={() => setLoading(false)}
        />
        {loading ? <LoadingState message="Loading video…" style={styles.playerLoading} /> : null}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + spacing.md }]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={colors.inkPrimary} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {video?.publishedAt ? (
          <Text style={styles.meta}>Quite Frankly · {relativeTime(video.publishedAt)}</Text>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(youtubeUrl)}
          >
            <Text style={styles.actionText}>Watch on YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Share.share({ message: title, url: youtubeUrl })}
          >
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        <Text style={styles.description}>
          [Video description placeholder — episode summary, timestamps,
          links pulled from the YouTube description field.]
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  playerArea: {
    height: 220,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    padding: spacing.xs,
    // Guarantees contrast regardless of what's in the video thumbnail
    // behind it — same treatment as Home's play button overlay.
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: radius.md,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  playerLoading: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
  },
  meta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginVertical: spacing.md,
  },
  description: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
});
