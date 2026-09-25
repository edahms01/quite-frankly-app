import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

// Every screen using this renders it as a plain child (inside a ScrollView
// or View, not wrapped in its own SafeAreaView), so without accounting for
// the status bar/notch inset here, the title and back chevron render
// underneath the status bar — present in the tree, but visually blurred
// and effectively unreadable/untappable. Fixing centrally here covers
// every consuming screen at once.
export default function BackHeader({ title, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.md }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <ChevronLeft color={colors.inkPrimary} size={24} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
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
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
  },
});
