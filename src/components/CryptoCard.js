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

// One card shape for every coin — a coin with one address renders as a
// single row (title, address, Copy all inline), a coin with several
// values (a destination tag, or one address per chain) gets a title
// header plus one row per field below it, each independently copyable.
export default function CryptoCard({ title, fields }) {
  const copy = async (value, label) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  if (fields.length === 1 && !fields[0].label) {
    const f = fields[0];
    return (
      <View style={styles.cryptoCard}>
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
    <View style={styles.cryptoCard}>
      <Text style={styles.cryptoTitle}>{title}</Text>
      {fields.map((f, i) => (
        <TouchableOpacity
          key={f.label ?? i}
          style={styles.fieldRow}
          onPress={() => copy(f.value, f.label ? `${title} ${f.label}` : title)}
        >
          <View style={styles.fieldText}>
            {f.label ? <Text style={styles.fieldLabel}>{f.label}</Text> : null}
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
    padding: spacing.sm,
    gap: spacing.sm,
  },
  // Same shape as fieldRow (below) — no padding/width of its own, so it
  // inherits the exact same content box as the large cards' rows, instead
  // of having row-layout and card padding merged onto a single element.
  singleFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Fixed width sized for "DOGE" (the longest ticker) so every small
  // card's title occupies the same column — without this, a 3-letter
  // ticker (BTC/SOL/ETH) leaves the address and Copy button sitting
  // further left than they do on the 4-letter DOGE card. Smaller font
  // than the standard card title to leave more room for the address.
  singleFieldTitle: {
    width: 38,
    fontSize: fontSize.base,
  },
  cryptoTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldText: {
    flex: 1,
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
