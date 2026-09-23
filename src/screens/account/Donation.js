import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, fontFamily, fontSize, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import ExternalRow from '../../components/ExternalRow';

const BTC_ADDRESS = 'bc1q97w5aazjf7pjjl50n42kdmj9pqyn5zndwh3lng';
const XRP_ADDRESS = 'rnES2vQV6d2jLpavzf7y97XD4AfK1MjePu';

function CopyRow({ avatarText, title, address }) {
  const copy = async () => {
    await Clipboard.setStringAsync(address);
    Alert.alert('Copied', `${title} address copied to clipboard.`);
  };
  return <ExternalRow avatarText={avatarText} title={title} subtitle={address} badge="Copy" url={null} onPress={copy} />;
}

export default function Donation({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Donation" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.subtitle}>
          One-time ways to support the show — no subscription required.
        </Text>

        <ExternalRow
          avatarText="P"
          title="PayPal — One-Time Tip"
          url="http://www.paypal.me/QuiteFranklyLive"
        />
        <ExternalRow
          avatarText="A"
          title="Amazon Storefront"
          subtitle="Shop Frank's picks — no extra cost to you"
          url="https://amazon.com/shop/quitefranklyofficial"
        />
        <CopyRow avatarText="₿" title="Bitcoin" address={BTC_ADDRESS} />
        <CopyRow avatarText="X" title="XRP" address={XRP_ADDRESS} />

        <View style={styles.divider} />
        <Text style={styles.mail}>
          Prefer mail? Send letters, cards, or small gifts to: Quite
          Frankly, 222 Purchase Street, #105, Rye, NY 10580.
        </Text>
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
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginVertical: spacing.sm,
  },
  mail: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
