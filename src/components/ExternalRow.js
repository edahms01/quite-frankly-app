import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

export default function ExternalRow({ avatarText, title, subtitle, url, badge, onPress }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ?? (() => url && Linking.openURL(url))}
      activeOpacity={0.7}
    >
      {avatarText != null && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <ArrowUpRight color={colors.inkMuted} size={18} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.surfaceLine,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
});
