import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, Share } from 'react-native';
import { CirclePlay, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';

export default function VideoPlayer({ navigation, route }) {
  const title = route?.params?.title ?? '[Video title]';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.playerArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.inkPrimary} size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
          <CirclePlay color={colors.inkPrimary} size={56} />
        </TouchableOpacity>
        <Text style={styles.illustrative}>IN-APP PLAYER — ILLUSTRATIVE</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>Quite Frankly · 2d ago · 4.2K views</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL('https://www.youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ')}
          >
            <Text style={styles.actionText}>Watch on YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Share.share({ message: title })}
          >
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        <Text style={styles.description}>
          [Video description placeholder — episode summary, timestamps,
          links pulled from the YouTube description field.]
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  playerArea: {
    height: 220,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    padding: spacing.xs,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrative: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  body: {
    padding: spacing.md,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
  },
  meta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginVertical: spacing.md,
  },
  description: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
});
