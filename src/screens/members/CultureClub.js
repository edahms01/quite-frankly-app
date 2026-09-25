import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import AvatarButton from '../../components/AvatarButton';

const EVENTS = [
  { title: 'Book Club: [title]', when: 'Thu · 7:30 PM ET' },
  { title: 'Film Club: [title]', when: 'Sat · 8:00 PM ET' },
];

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
        <AvatarButton onPress={() => navigation.navigate('AccountStack')} />
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

        <TouchableOpacity style={styles.loginRow} onPress={() => WebBrowser.openBrowserAsync(LOGIN_URL)}>
          <Lock color={colors.inkMuted} size={16} />
          <Text style={styles.loginText}>Already a Sponsor? Log in on quitefrankly.tv</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>CULTURE CLUB CALENDAR</Text>
        {EVENTS.map((e) => (
          <TouchableOpacity
            key={e.title}
            style={styles.eventRow}
            onPress={() => WebBrowser.openBrowserAsync(LOGIN_URL)}
          >
            <Lock color={colors.inkMuted} size={16} />
            <View style={styles.eventTextBlock}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.eventWhen}>{e.when}</Text>
            </View>
            <View style={styles.membersBadge}>
              <Text style={styles.membersBadgeText}>MEMBERS</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    // Culture Club highlight — theme.js's glow shadow. iOS gets the real
    // colored glow; Android's elevation can't carry color, so this also
    // needs the explicit gold border fallback per theme.js's own comment.
    ...shadows.glow,
    borderWidth: 1,
    borderColor: colors.accentGold,
  },
  eventTextBlock: {
    flex: 1,
  },
  eventTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  eventWhen: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  calendarNote: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  membersBadge: {
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  membersBadgeText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
});
