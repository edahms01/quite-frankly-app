import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { useLiveStatus } from '../context/LiveStatusContext';

// Studio "ON AIR" sign, same look as the web one: Inter Bold 11px caps,
// letter-spacing 1. Off air: dim text and a hairline outline. Live: white
// text and a lit red outline with a red glow. iOS glows with a coloured
// shadow; Android 9+ with a coloured elevation shadow plus stacked red rings (GLOW_RINGS). Both need a solid shape
// to blur, so the live badge is filled with the ground colour. Off air has no
// glow at all.
// Android's coloured elevation shadow is too faint to read as a glow, so while live a few
// stacked translucent red rings are drawn behind the badge (offset px, opacity).
const GLOW_RINGS = [
  { offset: 10, opacity: 0.07 },
  { offset: 7, opacity: 0.12 },
  { offset: 4, opacity: 0.2 },
];

export default function OnAirBadge() {
  const { isLive } = useLiveStatus();
  return (
    <View>
      {isLive && Platform.OS === 'android'
        ? GLOW_RINGS.map(({ offset, opacity }) => (
            <View
              key={offset}
              pointerEvents="none"
              style={[
                styles.glowRing,
                { top: -offset, left: -offset, right: -offset, bottom: -offset, borderRadius: radius.sm + offset, opacity },
              ]}
            />
          ))
        : null}
      <View style={[styles.onAirBadge, isLive && styles.onAirBadgeLive]}>
        <Text style={[styles.onAirText, isLive && styles.onAirTextLive]}>ON AIR</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowRing: {
    position: 'absolute',
    backgroundColor: colors.statusLive,
  },
  onAirBadge: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  // The fill matches the ground (invisible as a fill) but gives the shadow a solid shape to blur, so the glow is a real halo and not just a faint blur of the thin border and text.
  onAirBadgeLive: {
    borderColor: colors.brandRedHi,
    backgroundColor: colors.bgBase,
    ...Platform.select({
      ios: {
        shadowColor: colors.statusLive,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 12,
      },
      android: {
        borderWidth: 1.5,
        borderColor: colors.statusLive,
        shadowColor: colors.statusLive,
        elevation: 10,
      },
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
