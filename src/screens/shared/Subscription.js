import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ArrowUpRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import { CryptoCardGrid } from '../../components/CryptoCard';
import { truncateAddress } from '../../utils/truncateAddress';

// Patreon/SubscribeStar use OS-level Linking.openURL (not WebView) so
// Universal Links/App Links can hand off to their native apps — see
// component-map's Subscription notes.
const PLATFORMS = [
  { label: 'Patreon', url: 'https://www.patreon.com/QuiteFrankly' },
  { label: 'SubscribeStar', url: 'https://www.subscribestar.com/quitefrankly' },
];

const PAYPAL_URL = 'http://www.paypal.me/QuiteFranklyLive';
const AMAZON_URL = 'https://amazon.com/shop/quitefranklyofficial';
const BTC_ADDRESS = 'bc1q97w5aazjf7pjjl50n42kdmj9pqyn5zndwh3lng';
const XRP_ADDRESS = 'rnES2vQV6d2jLpavzf7y97XD4AfK1MjePu';

const copyToClipboard = async (value, label) => {
  await Clipboard.setStringAsync(value);
  Alert.alert('Copied', `${label} address copied to clipboard.`);
};

export default function Subscription({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Become a Sponsor" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.sectionLabel}>MONTHLY SPONSORSHIP</Text>

        <TouchableOpacity
          style={styles.qfCard}
          onPress={() => navigation.navigate('SubscriptionCheckout')}
        >
          <View style={styles.qfHeader}>
            <View style={styles.qfAvatar}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.qfAvatarImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMMENDED</Text>
            </View>
          </View>
          <Text style={styles.qfTitle}>Sponsor Frank Directly</Text>
        </TouchableOpacity>

        <View style={styles.platformRow}>
          {PLATFORMS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={styles.platformCard}
              onPress={() => Linking.openURL(p.url)}
            >
              <ArrowUpRight color={colors.inkMuted} size={16} style={styles.platformArrow} />
              <View style={styles.platformIcon} />
              <Text style={styles.platformLabel}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>ONE-TIME DONATION</Text>
        <Text style={styles.subtitle}>
          Prefer a one-time contribution instead? No subscription required.
        </Text>

        <CryptoCardGrid>
          <TouchableOpacity style={styles.gridCard} onPress={() => Linking.openURL(PAYPAL_URL)}>
            <Text style={styles.gridCardTitle}>PayPal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridCard} onPress={() => Linking.openURL(AMAZON_URL)}>
            <Text style={styles.gridCardTitle}>Amazon</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gridCard, styles.gridCardRow]}
            onPress={() => copyToClipboard(BTC_ADDRESS, 'BTC')}
          >
            <Text style={styles.gridCardTitle}>BTC</Text>
            <Text style={[styles.gridCardValue, styles.gridCardValueInline]} numberOfLines={1}>
              {truncateAddress(BTC_ADDRESS)}
            </Text>
            <View style={styles.gridCardBadge}>
              <Text style={styles.gridCardBadgeText}>Copy</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gridCard, styles.gridCardRow]}
            onPress={() => copyToClipboard(XRP_ADDRESS, 'XRP')}
          >
            <Text style={styles.gridCardTitle}>XRP</Text>
            <Text style={[styles.gridCardValue, styles.gridCardValueInline]} numberOfLines={1}>
              {truncateAddress(XRP_ADDRESS)}
            </Text>
            <View style={styles.gridCardBadge}>
              <Text style={styles.gridCardBadgeText}>Copy</Text>
            </View>
          </TouchableOpacity>
        </CryptoCardGrid>

        <Text style={styles.mail}>
          Prefer mail? Send letters, cards, or small gifts to: Quite
          Frankly, 222 Purchase Street, #105, Rye, NY 10580.
        </Text>
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
    gap: spacing.md,
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  qfCard: {
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  qfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  qfAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qfAvatarImage: {
    width: '100%',
    height: '100%',
  },
  recommendedBadge: {
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recommendedText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
  qfTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  platformRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  platformCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  platformArrow: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLine,
  },
  platformLabel: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
  },
  gridCard: {
    width: '47%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridCardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  gridCardTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  gridCardValue: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  gridCardValueInline: {
    flexShrink: 1,
  },
  gridCardBadge: {
    backgroundColor: colors.surfaceLine,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  gridCardBadgeText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
  mail: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
