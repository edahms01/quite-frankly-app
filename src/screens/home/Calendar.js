import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar as CalendarIcon, Sun, Moon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';

// Real source (Frank's digital calendar) not yet confirmed — see plan doc's
// "Calendar's real source" open item. Placeholder message shown for now;
// the full weekly view below is built and ready, just hidden (display:'none')
// until there's a real feed to point it at — same pattern as the web
// version's Schedule.dc.html, translated 1:1 via RN's display style.
const SHOW_REAL_CALENDAR = false;

const TODAY_INDEX = new Date().getDay(); // 0 = Sun

const WEEK = [
  { day: 'Sun', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Mon', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Tue', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Wed', title: 'Book Club', time: '7:30 PM ET', period: 'evening', club: true, extra: 'Guest: [Name]' },
  { day: 'Thu', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Fri', title: 'Film Club', time: '8:00 PM ET', period: 'evening', club: true },
  { day: 'Sat', title: 'Morning Stream', time: '10:00 AM ET', period: 'day', club: false },
];

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

export default function Calendar({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Calendar" navigation={navigation} />

      {!SHOW_REAL_CALENDAR && (
        <View style={styles.placeholder}>
          <CalendarIcon color={colors.inkMuted} size={40} />
          <Text style={styles.placeholderText}>
            If you'd like to see a show calendar, message Frank and ask him
            to start using a digital calendar for show times. And we can
            link it in the app.
          </Text>
        </View>
      )}

      <View style={SHOW_REAL_CALENDAR ? undefined : styles.hidden}>
        <ScrollView style={styles.container} contentContainerStyle={styles.weekBody}>
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
          {WEEK.map((item, i) => (
            <DayCard key={item.day} item={item} isToday={i === TODAY_INDEX} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  hidden: {
    display: 'none',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  placeholderText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  weekBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
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
