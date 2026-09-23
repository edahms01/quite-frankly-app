import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

export default function BackHeader({ title, navigation }) {
  return (
    <View style={styles.row}>
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
    padding: spacing.md,
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
