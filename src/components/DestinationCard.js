import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../theme';

// fixedHeight: opt in only where labels can genuinely vary enough to wrap
// to 2 lines (Shop's live sheet-driven store names, Writing's one long
// "Newsletter Archive" label next to a short one) — reserves a 2-line box
// so every card in that grid matches. Home's labels are short, known,
// hardcoded single words; forcing the same reserved box there just adds
// dead space under the label for no reason, so it stays off (default) and
// keeps its original compact, content-sized look.
// style: merged onto the card's own width/shape — e.g. Community.js
// overrides `width: '47%'` to `flex: 1` for its 3-up (non-wrapping) row,
// instead of maintaining a separate near-duplicate tile component.
// subtext: optional second line (e.g. "Coming Soon") for a not-yet-live
// destination — its presence also mutes the icon/label color, since a
// coming-soon tile reading as fully "live" would be misleading. No route
// wired yet for these, so onPress is typically omitted by the caller.
export default function DestinationCard({ Icon, label, onPress, fixedHeight = false, style, subtext }) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      <Icon color={subtext ? colors.inkMuted : colors.inkPrimary} size={24} />
      {fixedHeight ? (
        <View style={styles.labelBox}>
          <Text style={[styles.label, subtext && styles.labelMuted]} numberOfLines={2}>{label}</Text>
        </View>
      ) : (
        <Text style={[styles.label, subtext && styles.labelMuted]}>{label}</Text>
      )}
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
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
  labelMuted: {
    color: colors.inkMuted,
  },
  subtext: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regularItalic,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
