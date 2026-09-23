import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CirclePlay, Pause } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';

// Realistic mock shaped like the real SC-RSS feed (Phase 3 wires the live
// fetch + backend pagination cache).
const EPISODES = [
  { title: 'Frank Talks the Week\'s Fallout', when: '3d ago', duration: '1h 22m' },
  { title: 'Live Q&A: Ask Frank Anything', when: '4d ago', duration: '1h 47m' },
  { title: 'The Culture War Recap', when: '1w ago', duration: '1h 33m' },
  { title: 'Guest Spot: Late Night Ramble', when: '1w ago', duration: '1h 58m' },
  { title: 'Breaking Down the Headlines', when: '2w ago', duration: '1h 41m' },
];

export default function Listen() {
  const [playingIndex, setPlayingIndex] = useState(null);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.title}>Listen</Text>
        {EPISODES.map((ep, i) => (
          <TouchableOpacity
            key={i}
            style={styles.row}
            onPress={() => setPlayingIndex(i)}
          >
            <View style={styles.iconCircle}>
              {playingIndex === i ? (
                <Pause color={colors.inkPrimary} size={16} />
              ) : (
                <CirclePlay color={colors.inkPrimary} size={16} />
              )}
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.episodeTitle}>{ep.title}</Text>
              <Text style={styles.episodeMeta}>{ep.when} · {ep.duration}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.loadMore}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      </ScrollView>

      {playingIndex !== null && (
        <View style={styles.miniPlayer}>
          <TouchableOpacity onPress={() => setPlayingIndex(null)}>
            <Pause color={colors.inkPrimary} size={18} />
          </TouchableOpacity>
          <View style={styles.miniPlayerText}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              {EPISODES[playingIndex].title}
            </Text>
            <Text style={styles.miniPlayerMeta}>12:04 / 1:42:00</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  episodeTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  episodeMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLine,
    padding: spacing.md,
  },
  miniPlayerText: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  miniPlayerMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
