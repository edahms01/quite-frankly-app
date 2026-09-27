import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import AvatarButton from '../../components/AvatarButton';
import OnAirBadge from '../../components/OnAirBadge';
import ScheduleTeaser from '../../components/ScheduleTeaser';
import { WEEK } from '../../data/mockSchedule';

const CLUB_DAYS = WEEK.filter((day) => day.club);

const LOGIN_URL = 'https://www.quitefrankly.tv/account/login';

export default function CultureClub({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('Home')}
            style={styles.backButton}
            hitSlop={12}
          >
            <ChevronLeft color={colors.inkPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Culture Club</Text>
        </View>
        <View style={styles.headerRight}>
          <OnAirBadge />
          <AvatarButton onPress={() => navigation.navigate('AccountStack')} />
        </View>
      </View>

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

        <Text style={styles.sectionLabel}>CULTURE CLUB CALENDAR</Text>
        <ScheduleTeaser items={CLUB_DAYS} showLegend={false} />
        <Text style={styles.calendarNote}>
          If you'd like to see a show calendar, message Frank and ask him
          to start using a digital calendar for show times. And we can
          link it in the app.
        </Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
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
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  calendarNote: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
