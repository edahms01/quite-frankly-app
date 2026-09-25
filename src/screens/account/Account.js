import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import { useAccountEmail } from '../../hooks/useAccountEmail';

const ROWS = [
  { label: 'Become a Sponsor', route: 'Subscription' },
  { label: 'Notifications', route: 'NotificationsSettings' },
];

export default function Account({ navigation }) {
  const { email, avatarInitial } = useAccountEmail();
  const [emailVisible, setEmailVisible] = useState(false);

  const emailDisplay = email ?? 'No email on file';

  return (
    <View style={styles.container}>
      <BackHeader title="Account" navigation={navigation} hideAvatar />
      <View style={styles.body}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{avatarInitial}</Text>
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

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('ReportBug')}
        >
          <Text style={styles.rowLabel}>Report a Bug</Text>
          <ChevronRight color={colors.inkMuted} size={18} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('DonateToApp')}
        >
          <Text style={styles.rowLabel}>Donate to App</Text>
          <ChevronRight color={colors.inkMuted} size={18} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutRow}>
          <Text style={styles.signOutText}>Sign Out</Text>
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
  body: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
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
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowLabel: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginVertical: spacing.sm,
  },
  signOutRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  signOutText: {
    color: colors.brandRed,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
