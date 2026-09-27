import { StyleSheet, Text, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY_ABBREVIATION = DAY_ABBREVIATIONS[new Date().getDay()];

function DayCard({ item, isToday }) {
  const PeriodIcon = item.period === 'day' ? Sun : Moon;
  return (
    <View
      style={[
        styles.dayCard,
        item.club && styles.dayCardClub,
        isToday && styles.dayCardToday,
      ]}
    >
      <View style={styles.dayCardHeader}>
        <Text style={styles.dayLabel}>{item.day}</Text>
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>TODAY</Text>
          </View>
        )}
      </View>
      <View style={styles.dayCardBody}>
        <PeriodIcon color={item.club ? colors.accentGold : colors.inkMuted} size={18} />
        <View>
          <Text style={styles.dayTitle}>{item.title}</Text>
          <Text style={styles.dayTime}>{item.time}</Text>
          {item.extra ? <Text style={styles.dayExtra}>{item.extra}</Text> : null}
        </View>
      </View>
    </View>
  );
}

// Non-interactive preview of what a real digital calendar could look like —
// dimmed and un-tappable, with a "Coming Soon" badge, rather than fully
// hidden. See mockSchedule.js for why.
export default function ScheduleTeaser({ items, showLegend = true, note }) {
  return (
    <View>
      <View style={styles.comingSoonBadge}>
        <Text style={styles.comingSoonText}>COMING SOON</Text>
      </View>

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <View style={styles.teaserBody} pointerEvents="none">
        {showLegend && (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.inkMuted }]} />
              <Text style={styles.legendText}>Regular show</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accentGold }]} />
              <Text style={styles.legendText}>Culture Club</Text>
            </View>
          </View>
        )}
        <View style={styles.weekBody}>
          {items.map((item) => (
            <DayCard key={item.day} item={item} isToday={item.day === TODAY_ABBREVIATION} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  comingSoonBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  comingSoonText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    letterSpacing: 0.5,
  },
  note: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  teaserBody: {
    opacity: 0.45,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  weekBody: {
    gap: spacing.sm,
  },
  dayCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceLine,
  },
  dayCardClub: {
    borderColor: colors.accentGold,
  },
  dayCardToday: {
    borderColor: colors.accentGold,
    borderWidth: 2,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dayLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  todayBadge: {
    backgroundColor: colors.accentGold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  todayBadgeText: {
    color: colors.surfaceGround,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
  dayCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  dayTime: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  dayExtra: {
    color: colors.accentGold,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
