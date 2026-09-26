import { Linking, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import CryptoCard, { CryptoCardGrid } from '../../components/CryptoCard';

// TODO(Eric): swap these for your real payment links before shipping.
// All have real mobile apps, so OS-level Linking.openURL (not an in-app
// browser) matches the pattern already used for Patreon/SubscribeStar/
// PayPal elsewhere in the app.
const TIP_APPS = [
  { label: 'Cash App', url: 'https://cash.app/$edahms33' },
  { label: 'Revolut', url: 'https://revolut.me/edahms' },
  { label: 'Monzo', url: 'https://monzo.me/ericdahms7?h=zFzxf2&account_type=personal' },
  { label: 'Wise', url: 'https://wise.com/pay/me/ericd1472' },
];

const ETH_ADDRESS = '0xaE388a30907dB33e22BAbAf2f01B4c1a8cFa88E8';
const SOL_ADDRESS = '2nLqfxfa1USEv7u3oRXhtUmS77bva56KvUvhN2rVabLD';

// Single-field entries render without a label line (just the value) so
// they read as compact cards, not miniature copies of the multi-field ones.
const SIMPLE_ADDRESSES = [
  { title: 'BTC', address: 'bc1q70cx4pn8fe5lyyu2h7h5pyaud4mwenx9neyukq' },
  { title: 'SOL', address: SOL_ADDRESS },
  { title: 'ETH', address: ETH_ADDRESS },
  { title: 'DOGE', address: 'DFqiz4ATSJ54EWJhMktXLNVo1JX3HzdHPP' },
];

const XRP_ADDRESS = 'rpvijHi2nVY9WWAJhojsAX5tJmHdmLtFhq';
const XRP_DESTINATION_TAG = '3462488927';

export default function DonateToApp({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Donate to App" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.blurb}>
          This app is built and maintained independently, separate from the
          show itself. Support here goes toward keeping it running and
          building new features, not to Frank or Quite Frankly directly. If
          you'd like to support the show instead, see Become a Sponsor.
        </Text>

        <Text style={styles.sectionLabel}>SEND A TIP</Text>
        <View style={styles.tipGrid}>
          {TIP_APPS.map((app) => (
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
        <CryptoCardGrid>
          {SIMPLE_ADDRESSES.map((c) => (
            <CryptoCard key={c.title} title={c.title} fields={[{ value: c.address }]} />
          ))}
          <CryptoCard
            title="XRP"
            fields={[
              { label: 'Address', value: XRP_ADDRESS },
              { label: 'Destination Tag', value: XRP_DESTINATION_TAG, truncate: false },
            ]}
          />
          <CryptoCard
            title="USDT"
            fields={[
              { label: 'Ethereum', value: ETH_ADDRESS },
              { label: 'Solana', value: SOL_ADDRESS },
            ]}
          />
          <CryptoCard
            title="USDC"
            fields={[
              { label: 'Ethereum', value: ETH_ADDRESS },
              { label: 'Solana', value: SOL_ADDRESS },
            ]}
          />
        </CryptoCardGrid>
      </View>
    </ScrollView>
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
  tipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tipCard: {
    width: '47%',
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
