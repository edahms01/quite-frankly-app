import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import CryptoCard, { CryptoCardGrid } from '../../components/CryptoCard';

// Patreon/SubscribeStar use OS-level Linking.openURL (not WebView) so
// Universal Links/App Links can hand off to their native apps — see
// component-map's Subscription notes.
const PLATFORMS = [
  {
    label: 'Patreon',
    url: 'https://www.patreon.com/QuiteFrankly',
    icon: require('../../../assets/patreon-icon.png'),
  },
  {
    label: 'SubscribeStar',
    url: 'https://www.subscribestar.com/quitefrankly',
    icon: require('../../../assets/subscribestar-icon.png'),
  },
];

const PAYPAL_URL = 'http://www.paypal.me/QuiteFranklyLive';
const AMAZON_URL = 'https://amazon.com/shop/quitefranklyofficial';
const BTC_ADDRESS = 'bc1q97w5aazjf7pjjl50n42kdmj9pqyn5zndwh3lng';
const XRP_ADDRESS = 'rnES2vQV6d2jLpavzf7y97XD4AfK1MjePu';

export default function Subscription({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Become a Sponsor" navigation={navigation} />
      <View style={styles.body}>
        <Section title="MONTHLY SPONSORSHIP">
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
                <Image source={p.icon} style={styles.platformIcon} resizeMode="contain" />
                <Text style={styles.platformLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="ONE-TIME DONATION">
          <Text style={styles.subtitle}>
            Prefer a one-time contribution instead?
          </Text>

          <CryptoCardGrid>
            <TouchableOpacity style={styles.gridCard} onPress={() => Linking.openURL(PAYPAL_URL)}>
              <Text style={styles.gridCardTitle}>PayPal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridCard} onPress={() => Linking.openURL(AMAZON_URL)}>
              <Text style={styles.gridCardTitle}>Amazon</Text>
            </TouchableOpacity>
            <CryptoCard title="BTC" fields={[{ value: BTC_ADDRESS }]} />
            <CryptoCard title="XRP" fields={[{ value: XRP_ADDRESS }]} />
          </CryptoCardGrid>
        </Section>

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
    gap: spacing.xl,
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
    borderRadius: radius.lg,
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
  // gap matches the app-wide small-card-grid standard (spacing.md) — see
  // CLAUDE.md's card taxonomy.
  platformRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  platformCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  platformIcon: {
    width: 40,
    height: 40,
  },
  platformLabel: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  // padding matches platformCard's shorthand — see CLAUDE.md's card
  // taxonomy ("small link card" family: platformCard/gridCard/tipCard all
  // use padding: spacing.md, not a paddingVertical/Horizontal split).
  gridCard: {
    width: '47%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridCardTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  mail: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
