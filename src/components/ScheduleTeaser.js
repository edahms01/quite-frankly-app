import { StyleSheet, Text, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY = new Date();
const TODAY_ABBREVIATION = DAY_ABBREVIATIONS[TODAY.getDay()];

// Sunday of the current week — every card's date is computed from this
// rather than hardcoded in mockSchedule.js, so the placeholder week always
// shows real, current dates instead of going stale.
const WEEK_START = new Date(TODAY);
WEEK_START.setDate(TODAY.getDate() - TODAY.getDay());

function fullDateFor(dayAbbr) {
  const date = new Date(WEEK_START);
  date.setDate(WEEK_START.getDate() + DAY_ABBREVIATIONS.indexOf(dayAbbr));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

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
        <Text style={styles.dayLabel} numberOfLines={1}>
          {fullDateFor(item.day)}
        </Text>
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>TODAY</Text>
          </View>
        )}
      </View>
      <View style={styles.dayCardBody}>
        <PeriodIcon color={item.club ? colors.accentGold : colors.inkMuted} size={22} />
        <View>
          <Text style={styles.dayTitle}>{item.title}</Text>
          <Text style={styles.dayTime}>
            {item.time}
            {item.extra ? <Text style={styles.dayExtraInline}> - {item.extra}</Text> : null}
          </Text>
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
    borderColor: colors.inkPrimary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  comingSoonText: {
    color: colors.inkPrimary,
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
  // xs (not sm) so a full 7-day week fits on one screen without scrolling.
  weekBody: {
    gap: spacing.xs,
  },
  dayCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.sm,
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
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayLabel: {
    flexShrink: 1,
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
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
  // Inline (nested Text) span within dayTime, not its own line — keeps
  // every card to a fixed 2-line body (title + time) regardless of
  // whether a show has an extra note, so all cards stay the same height.
  dayExtraInline: {
    color: colors.accentGold,
  },
});
