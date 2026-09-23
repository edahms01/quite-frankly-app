import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Lock, ChevronRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';

// Static UI only this phase — matches Design.html's branding/copy for the
// system-browser sheet. Real live session (expo-web-browser's
// openAuthSessionAsync against Frank's Squarespace page + return-URL
// detection) is Phase 6, not static-shell work — see plan.md.
export default function SubscriptionCheckout({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.chrome}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.done}>Done</Text>
        </TouchableOpacity>
        <View style={styles.urlBar}>
          <Lock color={colors.inkMuted} size={12} />
          <Text style={styles.urlText}>quitefrankly.tv</Text>
        </View>
      </View>

      <View style={styles.productCard}>
        <View style={styles.productAvatar} />
        <View>
          <Text style={styles.productTitle}>Become a sponsor, Darling!</Text>
          <Text style={styles.productSubtitle}>from $5.00 every month</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
      <View style={styles.tierRow}>
        <Text style={styles.tierText}>Lincoln - $5</Text>
        <ChevronRight color={colors.inkMuted} size={18} />
      </View>

      <View style={styles.lightSection}>
        <Text style={styles.lightTitle}>Your Email</Text>
        <Text style={styles.fieldLabel}>EMAIL</Text>
        <View style={styles.emailInput} />
        <Text style={styles.helperText}>
          You'll receive receipts and notifications at this email.
        </Text>

        <View style={styles.lightRow}>
          <Text style={styles.lightRowText}>Payment</Text>
          <ChevronRight color={colors.inkMuted} size={18} />
        </View>
        <View style={styles.lightRow}>
          <Text style={styles.lightRowText}>Review & Subscribe</Text>
          <ChevronRight color={colors.inkMuted} size={18} />
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('SubscriptionConfirmed')}
        >
          <Text style={styles.continueText}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  chrome: {
    backgroundColor: '#e9e9ec',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  done: {
    alignSelf: 'flex-start',
    color: '#0a6cf0',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
  },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  urlText: {
    color: '#4a4a4a',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    margin: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  productAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLine,
  },
  productTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  productSubtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    marginHorizontal: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tierText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  lightSection: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    marginTop: spacing.md,
    padding: spacing.md,
  },
  lightTitle: {
    color: '#111',
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: '#666',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  emailInput: {
    height: 40,
    backgroundColor: '#e9e9ec',
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  helperText: {
    color: '#777',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  lightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  lightRowText: {
    color: '#111',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
  },
  continueButton: {
    backgroundColor: '#111',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  continueText: {
    color: '#fff',
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
  },
});
