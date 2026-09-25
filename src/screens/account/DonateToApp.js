import { Alert, Linking, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import ExternalRow from '../../components/ExternalRow';

// TODO(Eric): swap these for your real payment links before shipping.
// All three have real mobile apps, so OS-level Linking.openURL (not an
// in-app browser) matches the pattern already used for Patreon/
// SubscribeStar/PayPal elsewhere in the app.
const TIP_APPS_ROW_1 = [
  { label: 'Cash App', url: 'https://cash.app/$yourname' },
  { label: 'Venmo', url: 'https://venmo.com/u/yourname' },
];
const TIP_APPS_ROW_2 = [
  { label: 'Revolut', url: 'https://revolut.me/yourname' },
  { label: 'Monzo', url: 'https://monzo.me/yourname' },
  { label: 'Wise', url: 'https://wise.com/pay/me/yourname' },
];

// TODO(Eric): swap these for your real wallet addresses before shipping.
const CRYPTO_ADDRESSES = [
  { avatarText: '₿', title: 'Bitcoin', address: 'bc1q_placeholder_btc_address' },
  { avatarText: 'X', title: 'XRP', address: 'r_placeholder_xrp_address' },
  { avatarText: 'S', title: 'Solana', address: 'placeholder_sol_address' },
];

function CopyRow({ avatarText, title, address }) {
  const copy = async () => {
    await Clipboard.setStringAsync(address);
    Alert.alert('Copied', `${title} address copied to clipboard.`);
  };
  return <ExternalRow avatarText={avatarText} title={title} subtitle={address} badge="Copy" url={null} onPress={copy} />;
}

export default function DonateToApp({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Donate to App" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.blurb}>
          This app is built and maintained independently, separate from the
          show itself. Support here goes toward keeping it running and
          building new features, not to Frank or Quite Frankly directly. If
          you'd like to support the show instead, see Become a Sponsor.
        </Text>

        <Text style={styles.sectionLabel}>SEND A TIP</Text>
        <View style={styles.tipRow}>
          {TIP_APPS_ROW_1.map((app) => (
            <TouchableOpacity
              key={app.label}
              style={styles.tipCard}
              onPress={() => Linking.openURL(app.url)}
            >
              <Text style={styles.tipLabel}>{app.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tipRow}>
          {TIP_APPS_ROW_2.map((app) => (
            <TouchableOpacity
              key={app.label}
              style={styles.tipCard}
              onPress={() => Linking.openURL(app.url)}
            >
              <Text style={styles.tipLabel}>{app.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>CRYPTO</Text>
        {CRYPTO_ADDRESSES.map((c) => (
          <CopyRow key={c.title} avatarText={c.avatarText} title={c.title} address={c.address} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  blurb: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tipLabel: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
