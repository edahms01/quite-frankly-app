import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CirclePlay, Pause } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { isOnMainTabs, navigateToFullPlayer, navigationRef } from '../navigation/navigationRef';

// Approximate native tab bar height — MiniPlayer lives outside
// NavigationContainer so it can't read the real tab bar's rendered height
// (e.g. via useBottomTabBarHeight()). Tune on-device if it looks off.
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

// MiniPlayer's own rendered height (progressTrack + bar, both below) — kept
// as one exported constant so screens that need to avoid covering it (e.g.
// the games feature's floating GameWindow/FAB) don't have to guess or
// duplicate this number. progressTrack (3) + bar's vertical padding
// (spacing.sm * 2 = 16) + bar's tallest content (iconCircle, 36) = 55.
const PROGRESS_HEIGHT = 3;
const BAR_CONTENT_HEIGHT = 36;
export const MINI_PLAYER_HEIGHT = PROGRESS_HEIGHT + spacing.sm * 2 + BAR_CONTENT_HEIGHT;

export default function MiniPlayer() {
  const { currentTrack, playbackState, position, duration, togglePlayPause } = useAudioPlayer();
  const insets = useSafeAreaInsets();
  const [onMainTabs, setOnMainTabs] = useState(isOnMainTabs());

  useEffect(() => {
    // addListener queues safely even before the container has mounted —
    // no need to gate this on navigationRef.isReady().
    const unsubscribe = navigationRef.addListener('state', () => {
      setOnMainTabs(isOnMainTabs());
    });
    return unsubscribe;
  }, []);

  if (!currentTrack || !onMainTabs) return null;

  const isPlaying = playbackState === 'playing';
  const progressPct = duration > 0 ? Math.min(position / duration, 1) * 100 : 0;

  return (
    <View style={[styles.wrapper, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <View style={styles.bar}>
        <TouchableOpacity style={styles.iconCircle} onPress={togglePlayPause}>
          {isPlaying ? (
            <Pause color={colors.inkPrimary} size={16} />
          ) : (
            <CirclePlay color={colors.inkPrimary} size={16} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.titleTouch} onPress={navigateToFullPlayer} activeOpacity={0.7}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    backgroundColor: colors.surfaceLine,
  },
  progressFill: {
    height: PROGRESS_HEIGHT,
    backgroundColor: colors.accentGold,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTouch: {
    flex: 1,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
