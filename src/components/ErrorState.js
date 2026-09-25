import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * Shared error message — matches the red error text Listen.js and
 * SubscriptionCheckout.js already hand-rolled. Pass onRetry to render a
 * retry link below the message; omit it for message-only errors.
 */
export default function ErrorState({ message, onRetry, style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} hitSlop={8}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
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
    color: colors.brandRed,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  retryText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
});
