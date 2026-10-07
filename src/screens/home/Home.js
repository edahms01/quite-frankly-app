import { useEffect, useState } from 'react';
import { RefreshControl,ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CirclePlay, Headphones, Crown, MessageSquare, ShoppingBag, Calendar as CalendarIcon, FileText, Music2, Gamepad2, Bot } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import DestinationCard from '../../components/DestinationCard';
import AvatarButton from '../../components/AvatarButton';
import Wordmark from '../../components/Wordmark';
import OnAirBadge from '../../components/OnAirBadge';
import UpcomingCountdown from '../../components/UpcomingCountdown';
import VideoEmbed from '../../components/VideoEmbed';
import VideoThumbnailOverlay from '../../components/VideoThumbnailOverlay';
import { useYouTubeFeed } from '../../context/YouTubeFeedContext';
import { useLiveStatus } from '../../context/LiveStatusContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { useVideoActiveSource } from '../../hooks/useVideoActiveSource';
import { relativeTime } from '../../utils/relativeTime';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

// Frank multistreams to YouTube/Twitch/Rumble/etc. simultaneously — isLive
// is a Twitch-webhook-driven signal (fast, no polling-limit delay), used
// purely to flip this card's badge/label. Playback itself is always the
// YouTube embed below: mostRecent already points at the live broadcast's
// own video ID once it starts (YouTube's RSS feed lists it as the newest
// entry), and the YouTube iframe player embeds a live stream the same way
// it embeds a VOD, so no separate live-specific embed path is needed.
// Matches VideoPlayer.js's playerArea — needed for the actual YouTube
// embed (not just our own thumbnail/play-button visuals) to render its UI
// within the visible area; at 160 the iframe's own play button rendered
// below the clipped bottom edge, making it untappable.
const VIDEO_HEIGHT = 220;

const DESTINATIONS = [
  { label: 'Watch', Icon: CirclePlay, route: 'Watch' },
  { label: 'Listen', Icon: Headphones, route: 'Listen' },
  { label: 'Culture Club', Icon: Crown, route: 'CultureClubTab' },
  { label: 'Community', Icon: MessageSquare, route: 'Community' },
  { label: 'Shop', Icon: ShoppingBag, route: 'Shop' },
  { label: 'Calendar', Icon: CalendarIcon, route: 'Calendar' },
  { label: 'Writing', Icon: FileText, route: 'Writing' },
  { label: 'Music', Icon: Music2, route: 'Music' },
  { label: 'Games', Icon: Gamepad2, route: 'Games' },
];

export default function Home({ navigation }) {
  const { mostRecent, loading, error, refetch } = useYouTubeFeed();
  const { isLive } = useLiveStatus();
  const { askfrankie_enabled: askFrankieEnabled } = useFeatureFlags();      // remote switch: off = the old "Coming Soon" tile, nothing else changes
  // The feed is otherwise fetched once at launch — when Twitch flips live, the
  // backend has just re-pinned tonight's stream as Most Recent, so pull it.
  useEffect(() => {
    if (isLive) refetch();
  }, [isLive]); // eslint-disable-line react-hooks/exhaustive-deps
  const [embedVisible, setEmbedVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { claim } = useVideoActiveSource({ onForcedStop: () => setEmbedVisible(false) });
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - 2 * spacing.md;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const goTo = (route) => {
    if (route === 'CultureClubTab') {
      navigation.getParent()?.navigate('CultureClub');
    } else {
      navigation.navigate(route);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />
      }
    >
      <View style={styles.header}>
        <Wordmark width={190} />
        <View style={styles.headerRight}>
          <View style={styles.onAirGroup}>
            <UpcomingCountdown scheduledStartTime={mostRecent?.scheduledStartTime} />
            <OnAirBadge />
          </View>
          <View style={styles.avatarNudge}>
            <AvatarButton onPress={() => navigation.navigate('AccountStack')} />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.mostRecentCard}
        onPress={() => {
          if (mostRecent) {
            claim();
            setEmbedVisible(true);
          }
        }}
        activeOpacity={0.85}
        // Once the embed is visible, the card itself must stop intercepting
        // touches so taps reach the WebView (tap-to-play inside the iframe).
        disabled={embedVisible || !mostRecent}
      >
        {embedVisible ? null : (
          <View style={[styles.badge, isLive && styles.badgeLive]}>
            <Text style={styles.badgeText}>{isLive ? 'LIVE NOW' : 'MOST RECENT'}</Text>
          </View>
        )}
        <View style={styles.thumbnail}>
          {embedVisible ? (
            <VideoEmbed videoId={mostRecent.id} width={cardWidth} height={VIDEO_HEIGHT} />
          ) : (
            <VideoThumbnailOverlay thumbnailUrl={mostRecent?.thumbnailUrl} />
          )}
        </View>
        <View style={styles.mostRecentInfo}>
          {loading ? (
            <LoadingState message="Loading…" style={styles.inlineState} />
          ) : error ? (
            <ErrorState message="Unable to load latest video" style={styles.inlineState} />
          ) : mostRecent ? (
            <>
              <Text style={styles.videoTitle} numberOfLines={2}>{mostRecent.title}</Text>
              <Text style={styles.videoMeta}>Uploaded {relativeTime(mostRecent.publishedAt)}</Text>
            </>
          ) : (
            <EmptyState message="No recent videos yet." style={styles.inlineState} />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sponsorButton}
        onPress={() => navigation.navigate('AccountStack', { screen: 'Subscription' })}
      >
        <Text style={styles.sponsorButtonText}>Become a Sponsor</Text>
      </TouchableOpacity>

      <View style={styles.grid}>
        {DESTINATIONS.map((d) => (
          <DestinationCard
            key={d.label}
            Icon={d.Icon}
            label={d.label}
            onPress={() => goTo(d.route)}
          />
        ))}
        {askFrankieEnabled ? (
          <DestinationCard
            Icon={Bot}
            label="AskFrankie AI"
            onPress={() => navigation.navigate('AskFrankie')}
            style={styles.askFrankieCard}
          />
        ) : (
          <DestinationCard
            Icon={Bot}
            label="AskFrankie AI"
            subtext="Coming Soon"
            style={styles.askFrankieCard}
          />
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
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sponsorButton: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  sponsorButtonText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  // Static nudge, tuned by eye — just moves AvatarButton down to meet
  // OnAirBadge's bottom edge, no change to OnAirBadge/onAirGroup at all.
  avatarNudge: {
    marginTop: 8,
  },
  // OnAirBadge's vertical center lines up with the seam between
  // UpcomingCountdown's two text lines — centered against the countdown
  // specifically, not the wordmark (that's headerRight's flex-end job).
  onAirGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mostRecentCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accentGold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    zIndex: 1,
  },
  badgeLive: {
    backgroundColor: colors.brandRed,
  },
  badgeText: {
    color: colors.surfaceGround,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
  thumbnail: {
    height: VIDEO_HEIGHT,
    backgroundColor: colors.surfaceLive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mostRecentInfo: {
    padding: spacing.md,
  },
  inlineState: {
    marginTop: 0,
    alignItems: 'flex-start',
  },
  videoTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  videoMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  // Tighter padding/gap than DestinationCard's default so the extra
  // "Coming Soon" line fits in roughly the same footprint as a standard
  // 2-line card, instead of growing taller than its row-mate.
  askFrankieCard: {
    paddingVertical: spacing.sm,
    gap: 2,
  },
});
