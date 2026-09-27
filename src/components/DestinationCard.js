import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../theme';

export default function DestinationCard({ Icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Icon color={colors.inkPrimary} size={24} />
      <View style={styles.labelBox}>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  // Fixed height (exactly 2 lines) on the wrapping View, not the Text
  // itself — a Text taller than its content top-aligns by default (no
  // reliable cross-platform vertical-align), so the height+centering
  // lives on labelBox instead, keeping the label vertically centered
  // under the icon whether it's 1 or 2 lines. A 1-line label just leaves
  // blank space in the box rather than the box shrinking, so every card
  // in a grid is the same height regardless of label length (e.g. "Blog"
  // vs "Newsletter Archive").
  labelBox: {
    height: 36,
    justifyContent: 'center',
  },
  label: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 18,
  },
});
