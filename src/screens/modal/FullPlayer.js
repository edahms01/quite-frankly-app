import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ChevronDown, CirclePlay, Pause } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { formatTime } from '../../utils/formatTime';

// Hand-rolled tap/drag scrubber on react-native-gesture-handler (already a
// dependency) rather than pulling in @react-native-community/slider as a
// new native dependency — matches the project's existing cost-discipline
// pattern (see Phase 4's hand-rolled Sheets client).
function Scrubber({ position, duration, seekTo }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [dragX, setDragX] = useState(0);

  const handleGesture = (event) => {
    const x = Math.min(Math.max(event.nativeEvent.x, 0), trackWidth);
    setSeeking(true);
    setDragX(x);
  };

  const handleStateChange = (event) => {
    const { state } = event.nativeEvent;
    if (state === State.END && trackWidth > 0 && duration > 0) {
      seekTo((dragX / trackWidth) * duration);
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      setSeeking(false);
    }
  };

  const pct = seeking
    ? trackWidth > 0
      ? dragX / trackWidth
      : 0
    : duration > 0
      ? Math.min(position / duration, 1)
      : 0;
  const displayPosition = seeking && duration > 0 ? pct * duration : position;

  return (
    <View>
      <PanGestureHandler minDist={0} onGestureEvent={handleGesture} onHandlerStateChange={handleStateChange}>
        <View style={styles.scrubTrack} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
          <View style={[styles.scrubFill, { width: `${pct * 100}%` }]} />
          <View style={[styles.scrubThumb, { left: `${pct * 100}%` }]} />
        </View>
      </PanGestureHandler>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

export default function FullPlayer({ navigation }) {
  const { currentTrack, playbackState, position, duration, togglePlayPause, seekTo } =
    useAudioPlayer();

  useEffect(() => {
    // Only reachable via tapping MiniPlayer, which only shows once a track
    // is loaded — but guard the edge case defensively.
    if (!currentTrack) {
      navigation.goBack();
    }
  }, [currentTrack, navigation]);

  if (!currentTrack) return null;

  const isPlaying = playbackState === 'playing';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronDown color={colors.inkPrimary} size={26} />
        </TouchableOpacity>
      </View>

      <View style={styles.artwork} />

      <Text style={styles.title}>{currentTrack.title}</Text>

      <ScrollView style={styles.descriptionScroll}>
        <Text style={styles.description}>{currentTrack.description}</Text>
      </ScrollView>

      <Scrubber position={position} duration={duration} seekTo={seekTo} />

      <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
        {isPlaying ? (
          <Pause color={colors.surfaceGround} size={28} />
        ) : (
          <CirclePlay color={colors.surfaceGround} size={28} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.lg,
  },
  artwork: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    marginBottom: spacing.sm,
  },
  descriptionScroll: {
    maxHeight: 120,
    marginBottom: spacing.lg,
  },
  description: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  scrubTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLine,
    justifyContent: 'center',
  },
  scrubFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentGold,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  scrubThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accentGold,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  timeText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  playButton: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
});
