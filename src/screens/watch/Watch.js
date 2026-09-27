import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { CirclePlay } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import BackHeader from '../../components/BackHeader';
import { useYouTubeFeed } from '../../context/YouTubeFeedContext';
import { relativeTime } from '../../utils/relativeTime';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const PAGE_SIZE = 20;

const PLATFORMS = [
  { label: 'YouTube', url: 'https://www.youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ' },
  { label: 'Rumble', url: 'https://rumble.com/c/QuiteFrankly' },
  { label: 'Twitch', url: 'https://www.twitch.tv/quitefranklylive' },
  // No dedicated Pilled app — opens in-app rather than kicking out to Safari.
  { label: 'Pilled', url: 'https://pilled.net/foxhole/27724/iframe?theme=black', inAppBrowser: true },
];

function VideoCard({ video, onPress }) {
  return (
    <TouchableOpacity style={styles.videoCard} onPress={onPress}>
      <View style={styles.thumbnail}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: video.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <CirclePlay color={colors.inkPrimary} size={28} />
        )}
      </View>
      <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
      <Text style={styles.videoMeta}>{relativeTime(video.publishedAt)}</Text>
    </TouchableOpacity>
  );
}

export default function Watch({ navigation }) {
  const { mostRecent, gridItems, loading, error } = useYouTubeFeed();
  // gridItems deliberately excludes the most recent video (poll-youtube.js
  // slices it off since Home shows it separately) — the top grid here
  // needs it added back in so Watch also shows the newest upload. The
  // History section's offset math below still starts at gridItems.length
  // + 1 (not allItems.length) since that's the same number of archive
  // items already shown on this screen either way.
  const allItems = mostRecent ? [mostRecent, ...gridItems] : gridItems;

  const [historyEpisodes, setHistoryEpisodes] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyLoadMoreError, setHistoryLoadMoreError] = useState(null);
  const [historyRefreshError, setHistoryRefreshError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const hasFetchedHistoryRef = useRef(false);

  const fetchHistoryPage = async (offset) => {
    const response = await fetch(
      `${API_BASE_URL}/.netlify/functions/get-youtube-episodes?offset=${offset}&limit=${PAGE_SIZE}`
    );
    if (!response.ok) throw new Error(`Episodes request failed: ${response.status}`);
    return response.json();
  };

  // startOffset defaults to gridItems.length + 1 so the history section's first
  // page doesn't re-show the videos already shown in the top grid above. The
  // top grid shows mostRecent (archive index 0) plus gridItems, so the first
  // archive item not shown there yet is gridItems.length + 1.
  const loadHistoryInitial = useCallback(async (isRefreshOfLoaded = false, startOffset = gridItems.length + 1) => {
    try {
      const data = await fetchHistoryPage(startOffset);
      if (mountedRef.current) {
        setHistoryEpisodes(data.episodes);
        setHistoryHasMore(data.hasMore);
        setHistoryError(null);
        setHistoryLoadMoreError(null);
        setHistoryRefreshError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        if (isRefreshOfLoaded) {
          setHistoryRefreshError(err.message);
        } else {
          setHistoryError(err.message);
        }
      }
    }
  }, [gridItems.length]);

  // Gated on the top grid's own `loading` so the first fetch's offset is
  // computed only after gridItems has settled — firing unconditionally on
  // mount would compute offset=0 before the context resolves, re-showing
  // the top grid's videos in the history section on a cold start.
  useEffect(() => {
    if (loading || hasFetchedHistoryRef.current) return;
    hasFetchedHistoryRef.current = true;
    (async () => {
      await loadHistoryInitial();
      if (mountedRef.current) setHistoryLoading(false);
    })();
  }, [loading, loadHistoryInitial]);

  // The top-grid/history split is a data-fetching detail (RSS feed vs. the
  // paginated archive) — visually it's one continuous grid that keeps
  // filling in as more loads, not two separate sections.
  const combinedItems = [...allItems, ...historyEpisodes];

  const onHistoryRefresh = async () => {
    if (mountedRef.current) setHistoryRefreshing(true);
    await loadHistoryInitial(historyEpisodes.length > 0);
    if (mountedRef.current) setHistoryRefreshing(false);
  };

  const loadHistoryMore = async () => {
    setHistoryLoadingMore(true);
    setHistoryLoadMoreError(null);
    try {
      const data = await fetchHistoryPage(gridItems.length + 1 + historyEpisodes.length);
      setHistoryEpisodes((prev) => [...prev, ...data.episodes]);
      setHistoryHasMore(data.hasMore);
    } catch (err) {
      setHistoryLoadMoreError(err.message);
    } finally {
      setHistoryLoadingMore(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={historyRefreshing}
          onRefresh={onHistoryRefresh}
          tintColor={colors.accentGold}
        />
      }
    >
      <BackHeader
        title="Watch"
        navigation={navigation}
        onBack={() => navigation.getParent()?.navigate('Home')}
      >
        <TouchableOpacity
          style={styles.sponsorButton}
          onPress={() => navigation.navigate('AccountStack', { screen: 'Subscription' })}
        >
          <Text style={styles.sponsorButtonText}>Become a Sponsor</Text>
        </TouchableOpacity>
      </BackHeader>

      <View style={styles.body}>
        <View style={styles.platformRow}>
          {PLATFORMS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={styles.platformPill}
              onPress={() => (p.inAppBrowser ? WebBrowser.openBrowserAsync(p.url, { dismissButtonStyle: 'close' }) : Linking.openURL(p.url))}
            >
              <Text style={styles.platformText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.grid}>
          {loading ? (
            <LoadingState message="Loading videos…" style={styles.stateFullWidth} />
          ) : error ? (
            <ErrorState message="Unable to load videos" style={styles.stateFullWidth} />
          ) : combinedItems.length === 0 && !historyLoading ? (
            <EmptyState message="No videos yet — check back soon." style={styles.stateFullWidth} />
          ) : (
            combinedItems.map((video) => (
              <VideoCard key={video.id} video={video} onPress={() => navigation.navigate('VideoPlayer', { video })} />
            ))
          )}
        </View>

        {!loading && !error && historyLoading ? (
          <LoadingState message="Loading more videos…" style={styles.stateFullWidth} />
        ) : null}
        {historyRefreshError ? (
          <ErrorState message="Couldn't refresh videos. Pull down and try again." style={styles.stateFullWidth} />
        ) : null}
        {historyError ? (
          <ErrorState
            message="Unable to load more videos"
            onRetry={() => loadHistoryInitial()}
            style={styles.stateFullWidth}
          />
        ) : null}
        {historyHasMore ? (
          <TouchableOpacity style={styles.loadMore} onPress={loadHistoryMore} disabled={historyLoadingMore}>
            {historyLoadingMore ? (
              <ActivityIndicator color={colors.accentGold} />
            ) : (
              <Text style={styles.loadMoreText}>Load More</Text>
            )}
          </TouchableOpacity>
        ) : null}
        {historyLoadMoreError ? (
          <ErrorState message="Couldn't load more videos." onRetry={loadHistoryMore} style={styles.stateFullWidth} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  // Matches Home.js's sponsorButton exactly (full-width, gold-bordered,
  // centered label) for visual consistency across screens.
  sponsorButton: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  sponsorButtonText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  platformPill: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  platformText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stateFullWidth: {
    width: '100%',
  },
  videoCard: {
    width: '47%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  thumbnail: {
    height: 80,
    backgroundColor: colors.surfaceLive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  videoMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
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
