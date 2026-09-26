import { useState } from 'react';
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CirclePlay, Headphones, Crown, MessageSquare, ShoppingBag, Calendar as CalendarIcon, FileText, Music2 } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import DestinationCard from '../../components/DestinationCard';
import AvatarButton from '../../components/AvatarButton';
import VideoEmbed from '../../components/VideoEmbed';
import VideoThumbnailOverlay from '../../components/VideoThumbnailOverlay';
import { useYouTubeFeed } from '../../context/YouTubeFeedContext';
import { useLiveStatus } from '../../hooks/useLiveStatus';
import { useVideoActiveSource } from '../../hooks/useVideoActiveSource';
import { useAccountEmail } from '../../hooks/useAccountEmail';
import { relativeTime } from '../../utils/relativeTime';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

// Frank multistreams to all platforms at once — one "live" signal is a
// proxy for "live everywhere" (see plan doc, Culture Club section). No
// per-platform live video ID exists anywhere in the data model (only a
// Twitch-webhook-driven isLive boolean), so Twitch is the concrete
// destination when live, matching Watch.js's platform row.
const LIVE_URL = 'https://www.twitch.tv/quitefranklylive';
// Matches VideoPlayer.js's playerArea — needed for the actual YouTube
// embed (not just our own thumbnail/play-button visuals) to render its UI
// within the visible area; at 160 the iframe's own play button rendered
// below the clipped bottom edge, making it untappable.
const VIDEO_HEIGHT = 220;

const DESTINATIONS = [
  { label: 'Watch', Icon: CirclePlay, route: 'Watch' },
  { label: 'Listen', Icon: Headphones, route: 'Listen' },
  { label: 'Culture Club', Icon: Crown, route: 'MembersOnlyTab' },
  { label: 'Community', Icon: MessageSquare, route: 'Community' },
  { label: 'Shop', Icon: ShoppingBag, route: 'Shop' },
  { label: 'Calendar', Icon: CalendarIcon, route: 'Calendar' },
  { label: 'Writing', Icon: FileText, route: 'Writing' },
  { label: 'Band', Icon: Music2, route: 'Band' },
];

export default function Home({ navigation }) {
  const { mostRecent, loading, error } = useYouTubeFeed();
  const { isLive } = useLiveStatus();
  const [embedVisible, setEmbedVisible] = useState(false);
  const { claim } = useVideoActiveSource({ onForcedStop: () => setEmbedVisible(false) });
  const { avatarInitial } = useAccountEmail();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - 2 * spacing.md;

  const goTo = (route) => {
    if (route === 'MembersOnlyTab') {
      navigation.getParent()?.navigate('MembersOnly');
    } else {
      navigation.navigate(route);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/quite-frankly-logo-final.png')}
          style={styles.wordmark}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          <View style={[styles.onAirBadge, isLive && styles.onAirBadgeLive]}>
            <Text style={[styles.onAirText, isLive && styles.onAirTextLive]}>ON AIR</Text>
          </View>
          <AvatarButton onPress={() => navigation.navigate('AccountStack')} initial={avatarInitial} />
        </View>
      </View>

      <TouchableOpacity
        style={styles.mostRecentCard}
        onPress={() => {
          if (isLive) {
            Linking.openURL(LIVE_URL);
          } else if (mostRecent) {
            claim();
            setEmbedVisible(true);
          }
        }}
        activeOpacity={0.85}
        // Once the embed is visible, the card itself must stop intercepting
        // touches so taps reach the WebView (tap-to-play inside the iframe).
        disabled={embedVisible || (!isLive && !mostRecent)}
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
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  sponsorButtonText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  wordmark: {
    width: 172,
    height: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Classic studio "ON AIR" sign — dim/unlit border when not live, lit
  // solid-red with a glow when live. Android can't carry shadow color via
  // elevation, so the border itself becomes the "lit" cue there instead.
  onAirBadge: {
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  onAirBadgeLive: {
    // A brighter, more saturated red than the app's usual brandRed —
    // that deep maroon doesn't read as "lit," it just reads as another
    // button. This one, with a wide soft-opacity glow behind it, is
    // closer to an actual neon/bulb "ON AIR" sign.
    backgroundColor: '#E0332B',
    borderColor: '#E0332B',
    ...Platform.select({
      ios: {
        shadowColor: '#E0332B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.95,
        shadowRadius: 12,
      },
      // Elevation can't carry color on Android — a brighter/thicker
      // border stands in for the glow there instead.
      android: { elevation: 6, borderWidth: 1.5 },
    }),
  },
  onAirText: {
    // Dimmer than the usual inkMuted secondary-text color on purpose —
    // this needs to read as "unlit," not just "quieter," so it can't be
    // mistaken for the live state at a glance.
    color: '#5C554E',
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
  },
  onAirTextLive: {
    color: colors.inkPrimary,
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
    gap: spacing.md,
  },
});
