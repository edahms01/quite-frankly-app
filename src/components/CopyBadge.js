import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../theme';
import { tag, tagGold, tagText } from '../design/qf-presets';

// The app's standard "Copy" pill (`tag` preset, gold outline and label, 11px bold). Presentational
// only — wrap it in a TouchableOpacity that does the actual copy. Used by
// PhoneLines.
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
  // alignSelf reset: rows that bottom-align this badge with their parent's alignItems would otherwise be overridden by the preset's flex-start.
  badge: {
    ...tag,
    ...tagGold,
    alignSelf: 'auto',
    flexShrink: 0,
  },
  badgeText: {
    ...tagText,
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
  },
});
