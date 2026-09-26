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
import { SafeAreaView } from 'react-native-safe-area-context';
import { CirclePlay, Pause, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useAccountEmail } from '../../hooks/useAccountEmail';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import AvatarButton from '../../components/AvatarButton';
import OnAirBadge from '../../components/OnAirBadge';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const PAGE_SIZE = 20;

export default function Listen({ navigation }) {
  const { currentTrack, playbackState, play, togglePlayPause } = useAudioPlayer();
  const { avatarInitial } = useAccountEmail();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);

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
  // through the same success/error handling. `isRefreshOfLoaded` tells it
  // whether this call is refreshing a list that already has episodes on
  // screen — on failure in that case we must not blow away what's already
  // loaded with the full-screen `error` state (same bug class as loadMore
  // blanking the list). The true initial load always passes false/omits
  // it, since there's nothing loaded yet to preserve.
  const loadInitial = useCallback(async (isRefreshOfLoaded = false) => {
    try {
      const data = await fetchPage(0);
      if (mountedRef.current) {
        setEpisodes(data.episodes);
        setHasMore(data.hasMore);
        setError(null);
        // Clear any stale inline error notices so they don't linger under
        // freshly-reloaded content.
        setLoadMoreError(null);
        setRefreshError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        if (isRefreshOfLoaded) {
          setRefreshError(err.message);
        } else {
          setError(err.message);
        }
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
    if (mountedRef.current) setRefreshing(true);
    await loadInitial(episodes.length > 0);
    if (mountedRef.current) setRefreshing(false);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={currentTrack && styles.listWithMiniPlayer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentGold}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('Home')}
              style={styles.backButton}
              hitSlop={12}
            >
              <ChevronLeft color={colors.inkPrimary} size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Listen</Text>
          </View>
          <View style={styles.headerRight}>
            <OnAirBadge />
            <AvatarButton onPress={() => navigation.navigate('AccountStack')} initial={avatarInitial} />
          </View>
        </View>

        <View style={styles.list}>
          {loading ? (
            <LoadingState style={styles.stateIndicator} />
          ) : error ? (
            <ErrorState
              message="Couldn't load episodes. Pull to refresh and try again."
              style={styles.stateIndicator}
            />
          ) : (
            <>
              {refreshError ? (
                <ErrorState
                  message="Couldn't refresh episodes. Pull down and try again."
                  style={styles.refreshError}
                />
              ) : null}
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
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  listWithMiniPlayer: {
    // MiniPlayer overlays app-wide as an absolute-positioned bar — keep the
    // last rows from being hidden underneath it while it's showing.
    paddingBottom: spacing.lg + 64,
  },
  stateIndicator: {
    marginTop: spacing.lg,
  },
  loadMoreError: {
    marginTop: spacing.sm,
  },
  refreshError: {
    marginTop: spacing.xs,
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
});
