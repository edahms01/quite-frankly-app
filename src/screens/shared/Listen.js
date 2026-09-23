import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CirclePlay, Pause } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const PAGE_SIZE = 20;

export default function Listen() {
  const [episodes, setEpisodes] = useState([]);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchPage = async (offset) => {
    const response = await fetch(
      `${API_BASE_URL}/.netlify/functions/get-soundcloud-episodes?offset=${offset}&limit=${PAGE_SIZE}`
    );
    if (!response.ok) throw new Error(`Episodes request failed: ${response.status}`);
    return response.json();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPage(0);
        if (!cancelled) {
          setEpisodes(data.episodes);
          setHasMore(data.hasMore);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(episodes.length);
      setEpisodes((prev) => [...prev, ...data.episodes]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.title}>Listen</Text>

        {loading ? (
          <ActivityIndicator color={colors.accentGold} style={styles.stateIndicator} />
        ) : error ? (
          <Text style={styles.errorText}>Couldn't load episodes. Pull to refresh and try again.</Text>
        ) : (
          <>
            {episodes.map((ep, i) => (
              <TouchableOpacity
                key={ep.guid ?? i}
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
                  <Text style={styles.episodeMeta}>
                    {relativeTime(ep.publishedAt)} · {ep.duration}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {hasMore ? (
              <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator color={colors.accentGold} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>

      {playingIndex !== null && (
        <View style={styles.miniPlayer}>
          <TouchableOpacity onPress={() => setPlayingIndex(null)}>
            <Pause color={colors.inkPrimary} size={18} />
          </TouchableOpacity>
          <View style={styles.miniPlayerText}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              {episodes[playingIndex].title}
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
  stateIndicator: {
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.brandRed,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    marginTop: spacing.lg,
    textAlign: 'center',
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
