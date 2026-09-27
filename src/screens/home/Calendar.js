import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import ScheduleTeaser from '../../components/ScheduleTeaser';
import { WEEK, SCHEDULE_NOTE } from '../../data/mockSchedule';

export default function Calendar({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Calendar" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <ScheduleTeaser items={WEEK} showLegend note={SCHEDULE_NOTE} />
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
