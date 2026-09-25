import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';

const CHECKOUT_URL =
  'https://www.quitefrankly.tv/patrons-products/quite-frankly-at-your-service';
const REDIRECT_URL = 'quitefrankly://checkout-complete';

export default function SubscriptionCheckout({ navigation }) {
  const [launchFailed, setLaunchFailed] = useState(false);

  const handleContinue = async () => {
    setLaunchFailed(false);
    try {
      // No admin access to Frank's Squarespace dashboard to configure a
      // post-purchase redirect (see plan's open question), so there's no
      // reliable signal to tell a completed purchase from the user just
      // closing the sheet — session closing resolves the same way either
      // way. Rather than falsely claiming success on every dismissal (the
      // prior behavior), just return to this screen; no confirmation
      // screen until real redirect detection exists.
      await WebBrowser.openAuthSessionAsync(CHECKOUT_URL, REDIRECT_URL);
    } catch (e) {
      // Launch failure (no browser/Custom Tabs available) is not the user
      // backing out — they never saw a checkout page, so don't advance.
      setLaunchFailed(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronDown color={colors.inkPrimary} size={26} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Become a Sponsor</Text>
      <Text style={styles.subtitle}>Plans start at $5/month.</Text>

      {launchFailed && (
        <Text style={styles.errorText}>Couldn't open checkout. Please try again.</Text>
      )}

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue to Secure Checkout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  errorText: {
    color: colors.brandRed,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  continueButton: {
    backgroundColor: colors.accentGold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  continueText: {
    color: colors.surfaceGround,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
  },
});
