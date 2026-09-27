import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import ScheduleTeaser from '../../components/ScheduleTeaser';
import { WEEK } from '../../data/mockSchedule';

export default function Calendar({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Calendar" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <ScheduleTeaser items={WEEK} showLegend />

        <View style={styles.note}>
          <CalendarIcon color={colors.inkMuted} size={32} />
          <Text style={styles.noteText}>
            If you'd like to see a show calendar, message Frank and ask him
            to start using a digital calendar for show times. And we can
            link it in the app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  note: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noteText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
