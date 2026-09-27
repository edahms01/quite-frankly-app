import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';
import AvatarButton from './AvatarButton';
import OnAirBadge from './OnAirBadge';

// Every screen using this renders it as a plain child (inside a ScrollView
// or View, not wrapped in its own SafeAreaView), so without accounting for
// the status bar/notch inset here, the title and back chevron render
// underneath the status bar — present in the tree, but visually blurred
// and effectively unreadable/untappable. Fixing centrally here covers
// every consuming screen at once.
// hideAvatar: Account.js already shows its own avatar inline (with the
// full email attached) — repeating it here would just duplicate it.
// onBack: defaults to navigation.goBack(), but a bottom-tab root screen
// (Watch/Listen/Culture Club) has nothing local to go back to — those
// pass navigation.getParent()?.navigate('Home') instead.
// titleElement: replaces the default Text title with a custom node (Video
// Player's wordmark image in place of a text title).
// children: an extra row rendered below the title row, inside the same
// horizontal padding (Watch/Listen/Video Player's "Become a Sponsor" CTA).
export default function BackHeader({
  title,
  navigation,
  hideAvatar = false,
  onBack,
  titleElement,
  children,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={onBack ?? (() => navigation.goBack())} style={styles.backButton}>
          <ChevronLeft color={colors.inkPrimary} size={24} />
        </TouchableOpacity>
        <View style={styles.titleSlot}>
          {titleElement ?? <Text style={styles.title}>{title}</Text>}
        </View>
        {hideAvatar ? null : (
          <View style={styles.headerRight}>
            <OnAirBadge />
            <AvatarButton onPress={() => navigation.navigate('AccountStack')} />
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  titleSlot: {
    flex: 1,
  },
  title: {
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
