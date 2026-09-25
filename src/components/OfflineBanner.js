import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize, spacing } from '../theme';
import { useNetwork } from '../context/NetworkContext';

/**
 * App-wide offline banner — mounted once at the root (App.js) rather than
 * duplicated per screen. Shows/hides based on NetworkContext's isConnected.
 */
export default function OfflineBanner() {
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: colors.brandRed,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  text: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
});
