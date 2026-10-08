import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

// inAppBrowser: pass true for destinations with no dedicated mobile app
// (opens via expo-web-browser instead of kicking out to Safari/the OS).
// Default stays OS-level Linking.openURL, for destinations (PayPal,
// Amazon) that do have a real app and should hand off to it.
export default function ExternalRow({ avatarText, title, subtitle, url, badge, onPress, inAppBrowser }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ?? (() => url && (inAppBrowser ? WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' }) : Linking.openURL(url)))}
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
      ) : null}
    </TouchableOpacity>
  );
}

// Rows with and without a subtitle share one height — the tall (title +
// subtitle) height is the standard, so short rows are padded up to it.
// Explicit lineHeights make that height deterministic across fonts.
const TITLE_LINE_HEIGHT = 20;
const SUBTITLE_LINE_HEIGHT = 16;
const SUBTITLE_GAP = 2;
const ROW_MIN_HEIGHT =
  spacing.md * 2 + TITLE_LINE_HEIGHT + SUBTITLE_GAP + SUBTITLE_LINE_HEIGHT;

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
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
    lineHeight: TITLE_LINE_HEIGHT,
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: SUBTITLE_LINE_HEIGHT,
    marginTop: SUBTITLE_GAP,
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
