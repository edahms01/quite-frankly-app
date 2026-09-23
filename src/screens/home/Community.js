import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MessageCircle, Send, MessageSquare, Camera, X, Music2, ChevronRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import BackHeader from '../../components/BackHeader';

const JOIN = [
  { label: 'Discord', Icon: MessageCircle, url: 'https://discord.gg/yzzqnGgzEv' },
  { label: 'Telegram', Icon: Send, url: 'https://t.me/quitefranklytv' },
  { label: 'Forum', Icon: MessageSquare, url: 'https://quitefranklyforum.vbulletin.net/forum/quite-frankly-forum' },
];

const FOLLOW = [
  { label: 'Instagram', Icon: Camera, url: 'https://www.instagram.com/quitefranklyofficial/' },
  { label: 'X', Icon: X, url: 'http://twitter.com/QuiteFranklyTV' },
  { label: 'Tumblr', Icon: Music2, url: 'http://stonedandstudying.tumblr.com' },
];

function IconTile({ label, Icon, url }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={() => Linking.openURL(url)} activeOpacity={0.7}>
      <Icon color={colors.inkPrimary} size={22} />
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Community({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Community" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.sectionLabel}>JOIN THE CONVERSATION</Text>
        <View style={styles.row}>
          {JOIN.map((j) => (
            <IconTile key={j.label} {...j} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>FOLLOW FRANK</Text>
        <View style={styles.row}>
          {FOLLOW.map((f) => (
            <IconTile key={f.label} {...f} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>EVENTS</Text>
        <TouchableOpacity
          style={styles.eventRow}
          onPress={() => Linking.openURL('https://www.quitefrankly.tv/the-quite-frankly-live-events')}
        >
          <Text style={styles.eventText}>Main Event · Oct 23, 2027</Text>
          <ChevronRight color={colors.inkMuted} size={18} />
        </TouchableOpacity>
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
    gap: spacing.md,
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  tileLabel: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
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
