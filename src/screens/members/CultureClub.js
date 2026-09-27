import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, Lock } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import ScheduleTeaser from '../../components/ScheduleTeaser';
import { WEEK, SCHEDULE_NOTE } from '../../data/mockSchedule';

const CLUB_DAYS = WEEK.filter((day) => day.club);

const LOGIN_URL = 'https://www.quitefrankly.tv/quite-frankly-members-only';

export default function CultureClub({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader
        title="Culture Club"
        navigation={navigation}
        onBack={() => navigation.getParent()?.navigate('Home')}
      />

      <View style={styles.body}>
        <Section title="ACCESS CULTURE CLUB">
          <View style={styles.actionCards}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.actionCardText}>Become a Sponsor to join Culture Club</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginCard}
              onPress={() => WebBrowser.openBrowserAsync(LOGIN_URL, { dismissButtonStyle: 'close' })}
            >
              <Lock color={colors.inkMuted} size={16} />
              <Text style={styles.loginCardText}>
                Already a Sponsor? Log in to QuiteFrankly.tv to access the Culture Club.
              </Text>
              <ArrowRight color={colors.inkMuted} size={16} />
            </TouchableOpacity>
          </View>
        </Section>

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
    gap: spacing.xl,
  },
  // Matches Section's own label-to-content gap (spacing.md), per Eric's
  // call — deliberately tighter than the app-wide between-sections gap
  // (spacing.xl), since these two cards are one group, not two sections.
  actionCards: {
    gap: spacing.md,
  },
  // Matches the gold "Become a Sponsor" button style used elsewhere
  // (Watch/Listen/Video Player's sponsorButton) exactly, so both the
  // join and login cards read as the same family of action.
  actionCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  actionCardText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  // Original (non-gold) card styling, kept at the same padding/radius as
  // actionCard so the two cards stay the same size — only the color
  // treatment and icon are different, per Eric's request not to gold-ify
  // this one.
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  loginCardText: {
    flex: 1,
    color: colors.inkPrimary,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
});
