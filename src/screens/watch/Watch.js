import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CirclePlay, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import AvatarButton from '../../components/AvatarButton';
import OnAirBadge from '../../components/OnAirBadge';
import { useAccountEmail } from '../../hooks/useAccountEmail';
import { useYouTubeFeed } from '../../context/YouTubeFeedContext';
import { useLiveStatus } from '../../hooks/useLiveStatus';
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

export default function Watch({ navigation }) {
  const { gridItems, loading, error } = useYouTubeFeed();
  const liveStatus = useLiveStatus();
  const { avatarInitial } = useAccountEmail();

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

  // startOffset defaults to gridItems.length so the history section's first
  // page doesn't re-show the videos already shown in the top grid above.
  const loadHistoryInitial = useCallback(async (isRefreshOfLoaded = false, startOffset = gridItems.length) => {
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

  const onHistoryRefresh = async () => {
    if (mountedRef.current) setHistoryRefreshing(true);
    await loadHistoryInitial(historyEpisodes.length > 0);
    if (mountedRef.current) setHistoryRefreshing(false);
  };

  const loadHistoryMore = async () => {
    setHistoryLoadingMore(true);
    setHistoryLoadMoreError(null);
    try {
      const data = await fetchHistoryPage(gridItems.length + historyEpisodes.length);
      setHistoryEpisodes((prev) => [...prev, ...data.episodes]);
      setHistoryHasMore(data.hasMore);
    } catch (err) {
      setHistoryLoadMoreError(err.message);
    } finally {
      setHistoryLoadingMore(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={historyRefreshing}
          onRefresh={onHistoryRefresh}
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
          <Text style={styles.title}>Watch</Text>
        </View>
        <View style={styles.headerRight}>
          <OnAirBadge />
          <AvatarButton onPress={() => navigation.navigate('AccountStack')} initial={avatarInitial} />
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusText}>
          {liveStatus.loading ? 'Checking live status…' : liveStatus.isLive ? 'LIVE NOW' : 'Not live right now'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.listenInsteadRow}
        onPress={() => navigation.navigate('Listen')}
      >
        <Text style={styles.listenInsteadText}>Listen instead →</Text>
      </TouchableOpacity>

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
        ) : gridItems.length === 0 ? (
          <EmptyState message="No videos yet — check back soon." style={styles.stateFullWidth} />
        ) : (
          gridItems.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoCard}
              onPress={() => navigation.navigate('VideoPlayer', { video })}
            >
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
          ))
        )}
      </View>

      <Text style={[styles.title, styles.historyHeading]}>More Videos</Text>

      <View style={styles.grid}>
        {historyLoading ? (
          <LoadingState message="Loading more videos…" style={styles.stateFullWidth} />
        ) : historyError ? (
          <ErrorState message="Unable to load more videos" style={styles.stateFullWidth} />
        ) : (
          <>
            {historyRefreshError ? (
              <ErrorState message="Couldn't refresh videos. Pull down and try again." style={styles.stateFullWidth} />
            ) : null}
            {historyEpisodes.map((video) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoCard}
                onPress={() => navigation.navigate('VideoPlayer', { video })}
              >
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
            ))}
          </>
        )}
      </View>
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
  statusCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
  },
  listenInsteadRow: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  listenInsteadText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
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
  historyHeading: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
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
