import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors, fontFamily, fontSize, spacing } from '../theme';
import { activeOpacity, avatarChip, row, tag, tagGold, tagText } from '../design/qf-presets';

// inAppBrowser: pass true for destinations with no dedicated mobile app
// (opens via expo-web-browser instead of kicking out to Safari/the OS).
// Default stays OS-level Linking.openURL, for destinations (PayPal,
// Amazon) that do have a real app and should hand off to it.
export default function ExternalRow({ avatarText, title, subtitle, url, badge, onPress, inAppBrowser }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ?? (() => url && (inAppBrowser ? WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' }) : Linking.openURL(url)))}
      activeOpacity={activeOpacity}
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
  // `row` preset (raised fill, hairline, radius lg); minHeight keeps every row one height, padding is the app's uniform md.
  row: {
    ...row,
    minHeight: ROW_MIN_HEIGHT,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: avatarChip,
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
  // `tag` with a gold outline; alignSelf reset so it centers in the row instead of the preset's flex-start.
  badge: {
    ...tag,
    ...tagGold,
    alignSelf: 'auto',
  },
  badgeText: {
    ...tagText,
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
  },
});
