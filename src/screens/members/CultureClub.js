import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Lock } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import ScheduleTeaser from '../../components/ScheduleTeaser';
import { WEEK, SCHEDULE_NOTE } from '../../data/mockSchedule';

const CLUB_DAYS = WEEK.filter((day) => day.club);

const LOGIN_URL = 'https://www.quitefrankly.tv/account/login';

export default function CultureClub({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader
        title="Culture Club"
        navigation={navigation}
        onBack={() => navigation.getParent()?.navigate('Home')}
      />

      <View style={styles.body}>
        <View style={styles.joinRow}>
          <Text style={styles.joinText}>Become a Sponsor to join</Text>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginRow} onPress={() => WebBrowser.openBrowserAsync(LOGIN_URL, { dismissButtonStyle: 'close' })}>
          <Lock color={colors.inkMuted} size={16} />
          <Text style={styles.loginText}>Already a Sponsor? Log in on quitefrankly.tv</Text>
        </TouchableOpacity>

        <Section title="CULTURE CLUB CALENDAR">
          <ScheduleTeaser items={CLUB_DAYS} showLegend={false} note={SCHEDULE_NOTE} />
        </Section>
      </View>
    </ScrollView>
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
    gap: spacing.lg,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  joinText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  joinButton: {
    backgroundColor: colors.brandRed,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  joinButtonText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  loginText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    flex: 1,
  },
});
