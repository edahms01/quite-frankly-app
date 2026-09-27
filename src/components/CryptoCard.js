import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { truncateAddress } from '../utils/truncateAddress';

// Grid container for CryptoCard: cards are width: '47%' each, so two per
// row with flexWrap, matching the "narrow crypto card grid" layout used
// on both Donate to App and Become a Sponsor's crypto sections.
export function CryptoCardGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

// Regular's title column width (ticker + gap before the address) — Large
// rows pad by the same amount so both sizes' addresses line up in one
// vertical column down the page. Keep in sync with singleFieldTitle.width.
const TITLE_COLUMN_WIDTH = 38;

// Two size tiers, chosen automatically by field count — no `size` prop:
// - Regular (fields.length === 1, unlabeled): single row of title,
//   address, and Copy inline. Standard for any coin with one address.
// - Large (2+ fields, e.g. an address + destination tag, or one address
//   per chain): title header plus one row per field below it, each
//   independently copyable. No max field count.
export default function CryptoCard({ title, fields }) {
  const copy = async (value, label) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  if (fields.length === 1 && !fields[0].label) {
    const f = fields[0];
    return (
      <View style={[styles.cryptoCard, styles.cryptoCardRegular]}>
        <TouchableOpacity style={styles.singleFieldRow} onPress={() => copy(f.value, title)}>
          <Text style={[styles.cryptoTitle, styles.singleFieldTitle]}>{title}</Text>
          <View style={styles.singleFieldValueWrap}>
            <Text style={[styles.fieldValue, styles.singleFieldValueText]} numberOfLines={1}>
              {f.truncate === false ? f.value : truncateAddress(f.value)}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Copy</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.cryptoCard, styles.cryptoCardLarge]}>
      <Text style={[styles.cryptoTitle, styles.largeCardTitle]}>{title}</Text>
      {fields.map((f, i) => (
        <TouchableOpacity
          key={f.label ?? i}
          style={styles.fieldRow}
          onPress={() => copy(f.value, f.label ? `${title} ${f.label}` : title)}
        >
          <View style={styles.fieldText}>
            {f.label ? (
              <View style={styles.labelRow}>
                <Text style={[styles.labelBullet, f.bullet === false && styles.labelBulletHidden]}>
                  •
                </Text>
                <Text style={styles.fieldLabel}>{f.label}</Text>
              </View>
            ) : null}
            <Text style={styles.fieldValue}>
              {f.truncate === false ? f.value : truncateAddress(f.value)}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Copy</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cryptoCard: {
    width: '47%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  // Regular matches the page's other button-style cards (PayPal, Amazon,
  // the tip apps) — same paddingVertical as gridCard/tipCard, so it's the
  // same height/size, not the tighter Large card.
  cryptoCardRegular: {
    paddingVertical: spacing.md,
  },
  // Matches Regular's paddingVertical so both sizes have the same amount
  // of breathing room around their text, not just the same outer height.
  cryptoCardLarge: {
    paddingVertical: spacing.md,
  },
  // Regular-size row: title, address, Copy. paddingLeft nudges the title
  // inward from the card edge without affecting the badge's position
  // (badge is flexShrink: 0, pinned by the address wrap's flex: 1).
  singleFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  // Fixed width sized for "DOGE" (the longest ticker) so every small
  // card's title occupies the same column — without this, a 3-letter
  // ticker (BTC/SOL/ETH) leaves the address and Copy button sitting
  // further left than they do on the 4-letter DOGE card. Smaller font
  // than the standard card title to leave more room for the address.
  singleFieldTitle: {
    width: TITLE_COLUMN_WIDTH,
    fontSize: fontSize.base,
  },
  cryptoTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  // Large's header sits directly in cryptoCard (no row wrapper adding its
  // own inset like Regular's singleFieldRow.paddingLeft does), so it needs
  // that same paddingLeft here to line up with Regular's ticker.
  largeCardTitle: {
    paddingLeft: spacing.sm,
  },
  // paddingLeft matches Regular's title-column offset (paddingLeft +
  // width + gap) so fieldText's address column sits in the same vertical
  // line as Regular's addresses, without touching Regular's own styles.
  // alignItems: flex-end (not center) so Copy lines up with the address
  // line — the bottom of the label+address stack — instead of straddling
  // both lines.
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingLeft: spacing.sm + TITLE_COLUMN_WIDTH + spacing.sm,
  },
  fieldText: {
    flex: 1,
  },
  // Pulled in from the address column (fieldRow's paddingLeft) to sit
  // roughly halfway between the card header and the address — still
  // indented from the header, less indented than the address below it.
  // The bullet fills what would otherwise be bare margin and reads as
  // a list marker, tying each label to the address row beneath it.
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: -31,
  },
  labelBullet: {
    color: colors.accentGold,
    fontSize: fontSize.sm,
  },
  // Keeps the glyph's width+gap reserved (rather than omitting the node)
  // so a hidden bullet's label text still lands in the same column as a
  // visible bullet's label text above it.
  labelBulletHidden: {
    color: 'transparent',
  },
  fieldLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  fieldValue: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  // minWidth: 0 is required for a flex Text ancestor to actually shrink
  // below its content width in a narrow row — without it the badge gets
  // pushed past the card's edge instead of the address truncating.
  singleFieldValueWrap: {
    flex: 1,
    minWidth: 0,
  },
  singleFieldValueText: {
    marginTop: 0,
    textAlign: 'center',
  },
  // Shared by every card type (small and large) so both stay aligned by
  // construction. Its right edge is pinned to the card's content edge
  // regardless of padding, so narrowing it only moves its left edge
  // rightward (freeing width for the address) — it can never cross the
  // card boundary.
  badge: {
    flexShrink: 0,
    backgroundColor: colors.surfaceLine,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
});
