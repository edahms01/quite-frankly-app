import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { useLiveStatus } from '../context/LiveStatusContext';

// Studio "ON AIR" sign, same look as the web one: Inter Bold 11px caps,
// letter-spacing 1. Off air: dim text and a hairline outline. Live: white
// text and a lit red outline (no fill); iOS adds a soft red glow, Android a
// thicker border instead, since elevation cannot carry a colour.
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
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  onAirBadgeLive: {
    borderColor: colors.brandRedHi,
    ...Platform.select({
      ios: {
        shadowColor: colors.statusLive,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
      },
      android: { borderWidth: 1.5, borderColor: colors.statusLive },
    }),
  },
  // Off-air text is deliberately dim ("unlit", not just "quieter").
  onAirText: {
    color: colors.textDisabled,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.compact,
    letterSpacing: 1,
  },
  onAirTextLive: {
    color: colors.textOnRed,
  },
});
