import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CirclePlay, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import { useYouTubeFeed } from '../../context/YouTubeFeedContext';
import { useLiveStatus } from '../../hooks/useLiveStatus';
import { relativeTime } from '../../utils/relativeTime';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

const PLATFORMS = [
  { label: 'YouTube', url: 'https://www.youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ' },
  { label: 'Rumble', url: 'https://rumble.com/c/QuiteFrankly' },
  { label: 'Twitch', url: 'https://www.twitch.tv/quitefranklylive' },
  // No dedicated Pilled app — opens in-app rather than kicking out to Safari.
  { label: 'Pilled', url: 'https://pilled.net/foxhole/27724/iframe?theme=black', inAppBrowser: true },
];

export default function Watch({ navigation }) {
  const { gridItems, loading, error } = useYouTubeFeed();
  const liveStatus = useLiveStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate('Home')}
          style={styles.backButton}
          hitSlop={12}
        >
          <ChevronLeft color={colors.inkPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Watch</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusText}>
          {liveStatus.loading ? 'Checking live status…' : liveStatus.isLive ? 'LIVE NOW' : 'Not live right now'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.listenInsteadRow}
        onPress={() => navigation.navigate('Listen')}
      >
        <Text style={styles.listenInsteadText}>Listen instead →</Text>
      </TouchableOpacity>

      <View style={styles.platformRow}>
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={styles.platformPill}
            onPress={() => (p.inAppBrowser ? WebBrowser.openBrowserAsync(p.url) : Linking.openURL(p.url))}
          >
            <Text style={styles.platformText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.grid}>
        {loading ? (
          <LoadingState message="Loading videos…" style={styles.stateFullWidth} />
        ) : error ? (
          <ErrorState message="Unable to load videos" style={styles.stateFullWidth} />
        ) : gridItems.length === 0 ? (
          <EmptyState message="No videos yet — check back soon." style={styles.stateFullWidth} />
        ) : (
          gridItems.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoCard}
              onPress={() => navigation.navigate('VideoPlayer', { video })}
            >
              <View style={styles.thumbnail}>
                {video.thumbnailUrl ? (
                  <Image source={{ uri: video.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <CirclePlay color={colors.inkPrimary} size={28} />
                )}
              </View>
              <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
              <Text style={styles.videoMeta}>{relativeTime(video.publishedAt)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
  },
  statusCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
  },
  listenInsteadRow: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  listenInsteadText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  platformPill: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  platformText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  stateFullWidth: {
    width: '100%',
  },
  videoCard: {
    width: '47%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  thumbnail: {
    height: 80,
    backgroundColor: colors.surfaceLive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  videoMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
});
