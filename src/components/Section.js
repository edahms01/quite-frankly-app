import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

// The standard "labeled group of content" primitive for a page body — the
// label-to-content gap is fixed here (spacing.md) so it can't drift from
// screen to screen, and it's deliberately separate from the larger gap a
// screen's body uses BETWEEN Sections (spacing.xl) — the label should hug
// its own content, not read as its own section.
export default function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
  },
});
