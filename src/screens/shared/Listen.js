import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CirclePlay, Pause } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const PAGE_SIZE = 20;

export default function Listen() {
  const { currentTrack, playbackState, play, togglePlayPause } = useAudioPlayer();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);

  // Shared across every call site that can outlive the component (initial
  // mount fetch AND pull-to-refresh, both go through loadInitial) — a
  // per-call `cancelled` local (like Shop.js's load()) only guards the
  // call it was declared in, so a manual onRefresh invocation wouldn't be
  // covered by the mount effect's cleanup. A ref flipped once on unmount
  // covers every caller.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPage = async (offset) => {
    const response = await fetch(
      `${API_BASE_URL}/.netlify/functions/get-soundcloud-episodes?offset=${offset}&limit=${PAGE_SIZE}`
    );
    if (!response.ok) throw new Error(`Episodes request failed: ${response.status}`);
    return response.json();
  };

  // Shared by the initial mount fetch and pull-to-refresh, so both go
  // through the same success/error handling.
  const loadInitial = useCallback(async () => {
    try {
      const data = await fetchPage(0);
      if (mountedRef.current) {
        setEpisodes(data.episodes);
        setHasMore(data.hasMore);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadInitial();
      if (mountedRef.current) setLoading(false);
    })();
  }, [loadInitial]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await fetchPage(episodes.length);
      setEpisodes((prev) => [...prev, ...data.episodes]);
      setHasMore(data.hasMore);
    } catch (err) {
      // A loadMore failure shouldn't blank the already-loaded list — keep
      // it separate from the initial-load `error` state.
      setLoadMoreError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.list, currentTrack && styles.listWithMiniPlayer]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentGold}
          />
        }
      >
        <Text style={styles.title}>Listen</Text>

        {loading ? (
          <LoadingState style={styles.stateIndicator} />
        ) : error ? (
          <ErrorState
            message="Couldn't load episodes. Pull to refresh and try again."
            style={styles.stateIndicator}
          />
        ) : (
          <>
            {episodes.map((ep, i) => {
              const isCurrent = currentTrack?.guid === ep.guid;
              const isPlaying = isCurrent && playbackState === 'playing';
              return (
              <TouchableOpacity
                key={ep.guid ?? i}
                style={styles.row}
                onPress={() => (isCurrent ? togglePlayPause() : play(ep))}
              >
                <View style={styles.iconCircle}>
                  {isPlaying ? (
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
              );
            })}
            {hasMore ? (
              <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator color={colors.accentGold} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            ) : null}
            {loadMoreError ? (
              <ErrorState
                message="Couldn't load more episodes."
                onRetry={loadMore}
                style={styles.loadMoreError}
              />
            ) : null}
          </>
        )}
      </ScrollView>
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
  listWithMiniPlayer: {
    // MiniPlayer overlays app-wide as an absolute-positioned bar — keep the
    // last rows from being hidden underneath it while it's showing.
    paddingBottom: spacing.lg + 64,
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
  loadMoreError: {
    marginTop: spacing.sm,
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
});
