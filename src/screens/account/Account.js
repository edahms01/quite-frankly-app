import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Eye, EyeOff, User } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import { useAccountEmail } from '../../hooks/useAccountEmail';
import { signOut } from '../../lib/account';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { accountScreen } from '../../lib/featureFlags';

const ROWS = [
  { label: 'Support the Show', route: 'Subscription' },
  { label: 'Notifications', route: 'NotificationsSettings' },
];

// With the `accounts` flag off this screen is "Settings": no email row, no Sign Out, no Delete Account; every other row is unchanged.
export default function Account({ navigation }) {
  const view = accountScreen(useFeatureFlags());
  const { email } = useAccountEmail();
  const [emailVisible, setEmailVisible] = useState(false);

  const emailDisplay = email ?? 'No email on file';

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You can sign back in with your email any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <View style={styles.container}>
      <BackHeader title={view.title} navigation={navigation} hideAvatar />
      <View style={styles.body}>
        {view.showEmailRow ? (
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <User color={colors.inkPrimary} size={28} />
          </View>
          <View style={styles.emailRow}>
            <Text style={styles.email}>
              {emailVisible ? emailDisplay : '••••••••••••'}
            </Text>
            {email ? (
              <TouchableOpacity onPress={() => setEmailVisible((v) => !v)} hitSlop={8}>
                {emailVisible ? (
                  <EyeOff color={colors.inkMuted} size={18} />
                ) : (
                  <Eye color={colors.inkMuted} size={18} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        ) : null}

        <View style={styles.menuGroup}>
          {ROWS.map((r) => (
            <TouchableOpacity
              key={r.label}
              style={styles.row}
              onPress={() => navigation.navigate(r.route)}
            >
              <Text style={styles.rowLabel}>{r.label}</Text>
              <ChevronRight color={colors.inkMuted} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ReportBug')}
          >
            <Text style={styles.rowLabel}>Report a Bug / Request Features</Text>
            <ChevronRight color={colors.inkMuted} size={18} />
          </TouchableOpacity>
        </View>

        {view.showSignOut || view.showDeleteAccount ? (
        <View style={styles.menuGroup}>
          {view.showSignOut ? (
            <TouchableOpacity style={styles.signOutRow} onPress={confirmSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          ) : null}

          {view.showDeleteAccount ? (
            <TouchableOpacity style={styles.signOutRow} onPress={() => navigation.navigate('DeleteAccount')}>
              <Text style={styles.signOutText}>Delete Account</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        ) : null}
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
    gap: spacing.xl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuGroup: {
    gap: spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bgRaised2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  email: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowLabel: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  signOutRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  signOutText: {
    color: colors.statusError,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
