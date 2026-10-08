import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { MessageCircle, Send, MessageSquare, Camera, X, Music2, CirclePlay, ChevronRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import DestinationCard from '../../components/DestinationCard';

// Truth Social has no lucide glyph: a bold capital T, sized to the same
// box as the lucide icons so the tile height matches its neighbors.
const TruthIcon = ({ color, size }) => (
  <Text style={{ color, width: size, height: size, fontSize: size, lineHeight: size, fontFamily: fontFamily.bold, textAlign: 'center' }}>
    T
  </Text>
);

const JOIN = [
  { label: 'Discord', Icon: MessageCircle, url: 'https://discord.gg/yzzqnGgzEv' },
  { label: 'Telegram', Icon: Send, url: 'https://t.me/quitefranklytv' },
  // No dedicated Forum app — opens in-app rather than kicking out to Safari.
  { label: 'Forum', Icon: MessageSquare, url: 'https://quitefranklyforum.vbulletin.net/forum/quite-frankly-forum', inAppBrowser: true },
];

const FOLLOW = [
  { label: 'Instagram', Icon: Camera, url: 'https://www.instagram.com/quitefranklyofficial/' },
  { label: 'X', Icon: X, url: 'http://twitter.com/QuiteFranklyTV' },
  { label: 'Tumblr', Icon: Music2, url: 'http://stonedandstudying.tumblr.com' },
  { label: 'YouTube', Icon: CirclePlay, url: 'https://www.youtube.com/@QuiteFrankly/posts' },
  { label: 'Truth', Icon: TruthIcon, url: 'https://truthsocial.com/@QuiteFrankly' },
];

export default function Community({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Community" navigation={navigation} />
      <View style={styles.body}>
        <Section title="JOIN THE CONVERSATION">
          <View style={styles.grid}>
            {JOIN.map((j) => (
              <DestinationCard
                key={j.label}
                Icon={j.Icon}
                label={j.label}
                onPress={() => (j.inAppBrowser ? WebBrowser.openBrowserAsync(j.url, { dismissButtonStyle: 'close' }) : Linking.openURL(j.url))}
              />
            ))}
          </View>
        </Section>

        <Section title="FOLLOW FRANK">
          <View style={styles.grid}>
            {FOLLOW.map((f) => (
              <DestinationCard
                key={f.label}
                Icon={f.Icon}
                label={f.label}
                onPress={() => (f.inAppBrowser ? WebBrowser.openBrowserAsync(f.url, { dismissButtonStyle: 'close' }) : Linking.openURL(f.url))}
              />
            ))}
          </View>
        </Section>

        <Section title="EVENTS">
          <TouchableOpacity
            style={styles.eventRow}
            onPress={() => WebBrowser.openBrowserAsync('https://www.quitefrankly.tv/the-quite-frankly-live-events', { dismissButtonStyle: 'close' })}
          >
            <Text style={styles.eventText}>Main Event · Oct 23, 2027</Text>
            <ChevronRight color={colors.inkMuted} size={18} />
          </TouchableOpacity>
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
  // Both sections now use DestinationCard's default width: '47%',
  // wrapping into a 2-up grid, matching Home's own grid.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  eventText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
