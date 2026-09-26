import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { useLiveStatus } from '../hooks/useLiveStatus';

// Classic studio "ON AIR" sign — dim/unlit border when not live, lit
// solid-red with a glow when live. Android can't carry shadow color via
// elevation, so the border itself becomes the "lit" cue there instead.
export default function OnAirBadge() {
  const { isLive } = useLiveStatus();
  return (
    <View style={[styles.onAirBadge, isLive && styles.onAirBadgeLive]}>
      <Text style={[styles.onAirText, isLive && styles.onAirTextLive]}>ON AIR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
