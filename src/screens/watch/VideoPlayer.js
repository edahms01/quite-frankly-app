import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';
import VideoEmbed from '../../components/VideoEmbed';
import VideoThumbnailOverlay from '../../components/VideoThumbnailOverlay';
import AvatarButton from '../../components/AvatarButton';
import { useVideoActiveSource } from '../../hooks/useVideoActiveSource';
import { useAccountEmail } from '../../hooks/useAccountEmail';

// Matches Home.js's mostRecentCard video area, and playerArea's own height
// below — kept as one constant so VideoEmbed's explicit numeric height
// prop can't drift out of sync with the box it's rendered inside.
const PLAYER_HEIGHT = 220;

export default function VideoPlayer({ navigation, route }) {
  const video = route?.params?.video;
  const title = video?.title ?? '[Video title]';
  const youtubeUrl = video?.id
    ? `https://www.youtube.com/watch?v=${video.id}`
    : 'https://www.youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ';
  const insets = useSafeAreaInsets();
  const { avatarInitial } = useAccountEmail();
  const { width: windowWidth } = useWindowDimensions();
  // Arriving on this screen is itself the "play" action (matches today's
  // behavior, where the embed loads immediately on mount) — a podcast
  // starting stops it back to a tap-to-resume thumbnail.
  const [embedVisible, setEmbedVisible] = useState(true);
  const { claim } = useVideoActiveSource({ onForcedStop: () => setEmbedVisible(false) });

  useEffect(() => {
    claim();
  }, [claim]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.playerArea}>
        {embedVisible ? (
          <VideoEmbed videoId={video.id} width={windowWidth} height={PLAYER_HEIGHT} />
        ) : (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={0.85}
            onPress={() => {
              claim();
              setEmbedVisible(true);
            }}
          >
            <VideoThumbnailOverlay thumbnailUrl={video?.thumbnailUrl} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + spacing.md }]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={colors.inkPrimary} size={24} />
        </TouchableOpacity>
        <View style={[styles.avatarOverlay, { top: insets.top + spacing.md }]}>
          <AvatarButton onPress={() => navigation.navigate('AccountStack')} initial={avatarInitial} />
        </View>
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
    height: PLAYER_HEIGHT,
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
  avatarOverlay: {
    position: 'absolute',
    right: spacing.md,
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
