import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

// The app's standard "Copy" pill (gold label on surfaceLine). Presentational
// only — wrap it in a TouchableOpacity that does the actual copy. Used by
// CryptoCard and PhoneLines.
export default function CopyBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>Copy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // flexShrink: 0 pins the badge's right edge to its row's content edge;
  // a narrow sibling (e.g. an address) truncates instead of pushing it out.
  badge: {
    flexShrink: 0,
    backgroundColor: colors.surfaceLine,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
});
