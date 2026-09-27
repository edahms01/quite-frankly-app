import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { MessageCircle, Send, MessageSquare, Camera, X, Music2, ChevronRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import DestinationCard from '../../components/DestinationCard';

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
];

export default function Community({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Community" navigation={navigation} />
      <View style={styles.body}>
        <Section title="JOIN THE CONVERSATION">
          <View style={styles.row}>
            {JOIN.map((j) => (
              <DestinationCard
                key={j.label}
                Icon={j.Icon}
                label={j.label}
                style={styles.tile}
                onPress={() => (j.inAppBrowser ? WebBrowser.openBrowserAsync(j.url, { dismissButtonStyle: 'close' }) : Linking.openURL(j.url))}
              />
            ))}
          </View>
        </Section>

        <Section title="FOLLOW FRANK">
          <View style={styles.row}>
            {FOLLOW.map((f) => (
              <DestinationCard
                key={f.label}
                Icon={f.Icon}
                label={f.label}
                style={styles.tile}
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
  // gap matches the app-wide small-card-grid standard (spacing.md) — see
  // CLAUDE.md's card taxonomy.
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  // DestinationCard defaults to width: '47%' (2-up wrapping grids); this
  // is a fixed 3-up row instead, so it overrides to flex: 1.
  tile: {
    flex: 1,
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
