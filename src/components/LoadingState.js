import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * Shared loading indicator — spinner + optional message. Matches the
 * spinner color/style Listen.js used inline before consolidation.
 */
export default function LoadingState({ message, style }) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator color={colors.accentGold} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
