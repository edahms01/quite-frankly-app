import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * Shared "loaded successfully but nothing to show" message. Muted tone,
 * matching inkMuted secondary text used elsewhere in the app.
 */
export default function EmptyState({ message, style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  message: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
