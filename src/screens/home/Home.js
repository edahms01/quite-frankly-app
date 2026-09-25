import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CirclePlay, Headphones, Crown, MessageSquare, ShoppingBag, Calendar as CalendarIcon, FileText, Music2 } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import DestinationCard from '../../components/DestinationCard';
import AvatarButton from '../../components/AvatarButton';
import { useYouTubeFeed } from '../../context/YouTubeFeedContext';
import { useLiveStatus } from '../../hooks/useLiveStatus';
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
          <TouchableOpacity
            style={styles.sponsorButton}
            onPress={() => navigation.navigate('AccountStack', { screen: 'Subscription' })}
          >
            <Text style={styles.sponsorButtonText}>Become a Sponsor</Text>
          </TouchableOpacity>
          <AvatarButton onPress={() => navigation.navigate('AccountStack')} />
        </View>
      </View>

      <TouchableOpacity
        style={styles.mostRecentCard}
        onPress={() => {
          if (isLive) {
            Linking.openURL(LIVE_URL);
          } else if (mostRecent) {
            navigation.navigate('VideoPlayer', { video: mostRecent });
          }
        }}
        activeOpacity={0.85}
        disabled={!isLive && !mostRecent}
      >
        <View style={[styles.badge, isLive && styles.badgeLive]}>
          <Text style={styles.badgeText}>{isLive ? 'LIVE NOW' : 'MOST RECENT'}</Text>
        </View>
        <View style={styles.thumbnail}>
          {mostRecent?.thumbnailUrl ? (
            <Image source={{ uri: mostRecent.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={styles.playButton}>
            <CirclePlay color={colors.inkPrimary} size={28} />
          </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sponsorButton: {
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sponsorButtonText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
  },
  wordmark: {
    width: 172,
    height: 40,
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
    height: 160,
    backgroundColor: colors.surfaceLive,
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
