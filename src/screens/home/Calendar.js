import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import ScheduleTeaser from '../../components/ScheduleTeaser';
import { WEEK, SCHEDULE_NOTE } from '../../data/mockSchedule';
import { scheduleWeek, showScheduleLegend } from '../../lib/featureFlags';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

// Route/file stay "Calendar"; the visible name is Schedule.
export default function Calendar({ navigation }) {
  const flags = useFeatureFlags();
  return (
    <View style={styles.container}>
      <BackHeader title="Schedule" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <ScheduleTeaser items={scheduleWeek(flags, WEEK)} showLegend={showScheduleLegend(flags)} note={SCHEDULE_NOTE} />
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
    paddingBottom: spacing.lg,
  },
});
