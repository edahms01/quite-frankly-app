import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FileText, Mail } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import DestinationCard from '../../components/DestinationCard';

export default function Writing({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Writing" navigation={navigation} />
      <View style={styles.body}>
        <Section title="FRANK'S WRITING">
          <View style={styles.grid}>
            <DestinationCard
              Icon={FileText}
              label="Quite Blogly"
              onPress={() => WebBrowser.openBrowserAsync('https://www.quitefrankly.tv/blog', { dismissButtonStyle: 'close' })}
            />
            <DestinationCard
              Icon={Mail}
              label="Newsletter Archive"
              onPress={() => WebBrowser.openBrowserAsync('https://www.quitefrankly.tv/newsletter-archives', { dismissButtonStyle: 'close' })}
            />
          </View>
        </Section>

        <Section title="GUEST APPEARANCES">
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  // Matches ScheduleTeaser's "COMING SOON" badge exactly, for the same
  // placeholder-content meaning app-wide.
  comingSoonBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.inkPrimary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  comingSoonText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    letterSpacing: 0.5,
  },
});
