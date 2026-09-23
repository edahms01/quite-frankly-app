import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';

const ROWS = [
  { label: 'Subscription', route: 'Subscription' },
  { label: 'Notifications', route: 'NotificationsSettings' },
  { label: 'Donation', route: 'Donation' },
];

export default function Account({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Account" navigation={navigation} />
      <View style={styles.body}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>E</Text>
          </View>
          <View>
            <Text style={styles.name}>[Name]</Text>
            <Text style={styles.email}>[email@placeholder.com]</Text>
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
  name: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
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
