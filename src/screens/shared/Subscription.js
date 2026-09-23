import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';

// Patreon/SubscribeStar use OS-level Linking.openURL (not WebView) so
// Universal Links/App Links can hand off to their native apps — see
// component-map's Subscription notes.
const PLATFORMS = [
  { label: 'Patreon', url: 'https://www.patreon.com/QuiteFrankly' },
  { label: 'SubscribeStar', url: 'https://www.subscribestar.com/quitefrankly' },
];

export default function Subscription({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Subscription" navigation={navigation} />
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
});
