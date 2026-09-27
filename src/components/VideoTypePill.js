import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

// contentType comes from poll-youtube.js's classifyVideo() — 'short' |
// 'video' | 'live'. "Stream" is the display label for 'live' (the data
// value stays 'live' to match the sheet/archive column).
const TYPE_META = {
  short: { label: 'Short', color: colors.typeShort },
  video: { label: 'Video', color: colors.typeVideo },
  live: { label: 'Stream', color: colors.typeStream },
};

// Renders nothing for an unrecognized/missing type (e.g. an older cached
// item from before contentType existed) rather than guessing a label.
// textStyle: optional override for the label (e.g. Video Player sizes
// this pill to match its action buttons) — style only affects the pill's
// own box.
export default function VideoTypePill({ type, style, textStyle }) {
  const meta = TYPE_META[type];
  if (!meta) return null;
  return (
    <View style={[styles.pill, { backgroundColor: meta.color }, style]}>
      <Text style={[styles.pillText, textStyle]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  pillText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
});
