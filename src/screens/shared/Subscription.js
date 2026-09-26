import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import ExternalRow from '../../components/ExternalRow';
import CryptoCard, { CryptoCardGrid } from '../../components/CryptoCard';

// Patreon/SubscribeStar use OS-level Linking.openURL (not WebView) so
// Universal Links/App Links can hand off to their native apps — see
// component-map's Subscription notes.
const PLATFORMS = [
  { label: 'Patreon', url: 'https://www.patreon.com/QuiteFrankly' },
  { label: 'SubscribeStar', url: 'https://www.subscribestar.com/quitefrankly' },
];

const BTC_ADDRESS = 'bc1q97w5aazjf7pjjl50n42kdmj9pqyn5zndwh3lng';
const XRP_ADDRESS = 'rnES2vQV6d2jLpavzf7y97XD4AfK1MjePu';

export default function Subscription({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Become a Sponsor" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.subtitle}>Not a member yet. Choose how you'd like to subscribe:</Text>

        <TouchableOpacity
          style={styles.qfCard}
          onPress={() => navigation.navigate('SubscriptionCheckout')}
        >
          <View style={styles.qfHeader}>
            <View style={styles.qfAvatar}>
              <Text style={styles.qfAvatarText}>QF</Text>
            </View>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMMENDED</Text>
            </View>
          </View>
          <Text style={styles.qfTitle}>Continue with Quite Frankly</Text>
          <Text style={styles.qfSubtitle}>Signs you up right here in the app</Text>
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

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>ONE-TIME SUPPORT</Text>
        <Text style={styles.subtitle}>
          Prefer a one-time contribution instead? No subscription required.
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
        <CryptoCardGrid>
          <CryptoCard title="BTC" fields={[{ value: BTC_ADDRESS }]} />
          <CryptoCard title="XRP" fields={[{ value: XRP_ADDRESS }]} />
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
    borderColor: colors.brandRed,
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
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qfAvatarText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
  },
  recommendedBadge: {
    borderWidth: 1,
    borderColor: colors.brandRed,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recommendedText: {
    color: colors.brandRed,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
  qfTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  qfSubtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
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
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginVertical: spacing.xs,
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
  },
  mail: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
