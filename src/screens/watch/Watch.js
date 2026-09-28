import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { CirclePlay } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import BackHeader from '../../components/BackHeader';
import VideoTypePill from '../../components/VideoTypePill';
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
      <View style={styles.metaRow}>
        <Text style={styles.videoMeta}>{relativeTime(video.publishedAt)}</Text>
        <VideoTypePill type={video.contentType} />
      </View>
    </TouchableOpacity>
  );
}

export default function Watch({ navigation }) {
  // Reads straight from the archive (paginated, freshest-first — see
  // mergeVideosById in netlify/functions/lib/youtube.js), not the RSS-poll
  // cache. The RSS poll's only job is discovering brand-new videos to add
  // to the archive; once a video is archived, Watch always loads it from
  // there. This mirrors Listen.js's single-source pattern.
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPage = async (offset) => {
    const response = await fetch(
      `${API_BASE_URL}/.netlify/functions/get-youtube-episodes?offset=${offset}&limit=${PAGE_SIZE}`
    );
    if (!response.ok) throw new Error(`Episodes request failed: ${response.status}`);
    return response.json();
  };

  const loadInitial = useCallback(async (isRefreshOfLoaded = false) => {
    try {
      const data = await fetchPage(0);
      if (mountedRef.current) {
        setVideos(data.episodes);
        setHasMore(data.hasMore);
        setError(null);
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
    await loadInitial(videos.length > 0);
    if (mountedRef.current) setRefreshing(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await fetchPage(videos.length);
      setVideos((prev) => [...prev, ...data.episodes]);
      setHasMore(data.hasMore);
    } catch (err) {
      setLoadMoreError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
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
          ) : videos.length === 0 ? (
            <EmptyState message="No videos yet — check back soon." style={styles.stateFullWidth} />
          ) : (
            videos.map((video) => (
              <VideoCard key={video.id} video={video} onPress={() => navigation.navigate('VideoPlayer', { video })} />
            ))
          )}
        </View>

        {refreshError ? (
          <ErrorState message="Couldn't refresh videos. Pull down and try again." style={styles.stateFullWidth} />
        ) : null}
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
          <ErrorState message="Couldn't load more videos." onRetry={loadMore} style={styles.stateFullWidth} />
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
    paddingHorizontal: spacing.md,
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
  // marginTop tops up the gap above this row to match the gap below it
  // (body's spacing.xl) — without it, the only space above comes from
  // BackHeader's own paddingBottom (spacing.md), half as much.
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
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
  // lineHeight + a fixed height (exactly 2 lines) instead of letting the
  // Text size itself to 1 or 2 lines of actual content — a 1-line title
  // just leaves its own second line blank, so the meta row below always
  // starts at the same spot and every card is the same height, instead of
  // adding reserved space *after* a variable-height title.
  videoTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: 16,
    height: 32,
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  videoMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
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
