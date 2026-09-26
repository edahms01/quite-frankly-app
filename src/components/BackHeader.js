import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';
import AvatarButton from './AvatarButton';
import OnAirBadge from './OnAirBadge';
import { useAccountEmail } from '../hooks/useAccountEmail';

// Every screen using this renders it as a plain child (inside a ScrollView
// or View, not wrapped in its own SafeAreaView), so without accounting for
// the status bar/notch inset here, the title and back chevron render
// underneath the status bar — present in the tree, but visually blurred
// and effectively unreadable/untappable. Fixing centrally here covers
// every consuming screen at once.
// hideAvatar: Account.js already shows its own avatar inline (with the
// full email attached) — repeating it here would just duplicate it.
export default function BackHeader({ title, navigation, hideAvatar = false }) {
  const insets = useSafeAreaInsets();
  const { avatarInitial } = useAccountEmail();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.md }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <ChevronLeft color={colors.inkPrimary} size={24} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {hideAvatar ? null : (
        <View style={styles.headerRight}>
          <OnAirBadge />
          <AvatarButton onPress={() => navigation.navigate('AccountStack')} initial={avatarInitial} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    flex: 1,
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
