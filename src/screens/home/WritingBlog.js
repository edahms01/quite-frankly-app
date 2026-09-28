import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ImageIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const PAGE_SIZE = 15;
const CACHE_KEY = 'blog_posts_cache';

// Wireframe meta line format: "Mon D, YYYY · N min read" — no existing
// utils/*.js formatter produces this (relativeTime.js is "3d ago" style,
// wrong shape for this screen), so a small local formatter lives here
// rather than reusing/repurposing one that doesn't fit.
function formatPostDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

function metaLine(post) {
  const date = formatPostDate(post.publishedAt);
  const minutes = post.readMinutes ? `${post.readMinutes} min read` : null;
  return [date, minutes].filter(Boolean).join(' · ');
}

// Gradient placeholder for the featured card, matching the wireframe's
// linear-gradient(135deg, #2a2422 0%, #1E1B1F 60%, #3a1416 100%) treatment.
// RN's StyleSheet has no native gradient primitive, and this repo has no
// expo-linear-gradient dependency — approximate with a flat surfaceLine
// background (the gradient's dominant middle-to-start tone) rather than
// pull in a new dependency for a placeholder-only visual. Row thumbnails
// use the same flat surfaceLine block, matching the wireframe's row
// treatment (which is already flat, not gradient).
function ImagePlaceholder({ style, iconSize }) {
  return (
    <View style={[styles.imagePlaceholder, style]}>
      <ImageIcon color={colors.inkMuted} size={iconSize} />
    </View>
  );
}

function FeaturedCard({ post, onPress }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress}>
      {post.heroImageUrl ? (
        <Image source={{ uri: post.heroImageUrl }} style={styles.featuredImage} resizeMode="cover" />
      ) : (
        <ImagePlaceholder style={styles.featuredImage} iconSize={30} />
      )}
      <Text style={styles.featuredTitle} numberOfLines={2}>{post.title}</Text>
      <Text style={styles.featuredMeta}>{metaLine(post)}</Text>
    </TouchableOpacity>
  );
}

function PostRow({ post, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      {post.heroImageUrl ? (
        <Image source={{ uri: post.heroImageUrl }} style={styles.rowThumb} resizeMode="cover" />
      ) : (
        <ImagePlaceholder style={styles.rowThumb} iconSize={18} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>{post.title}</Text>
        <Text style={styles.rowMeta}>{metaLine(post)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function WritingBlog({ navigation }) {
  // Pagination state/shape adapted from Watch.js/Listen.js, driven by the
  // opaque cursor from get-blog-posts.js instead of an offset — everything
  // else (mountedRef guard, loadInitial shared by mount + pull-to-refresh,
  // loadMore appends and never blanks the list on failure) matches those
  // screens' pattern exactly.
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  // usingCache mirrors Shop.js's cache-fallback pattern: true once the
  // currently-displayed first page came from AsyncStorage rather than a
  // live fetch, so the "may be out of date" note renders under it.
  const [usingCache, setUsingCache] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPage = async (cursorParam) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursorParam) params.set('cursor', cursorParam);
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-blog-posts?${params.toString()}`);
    if (!response.ok) throw new Error(`Blog posts request failed: ${response.status}`);
    return response.json();
  };

  // Shared by the initial mount fetch and pull-to-refresh (same convention
  // as Watch.js/Listen.js). On success, also refreshes the first-page cache
  // fallback; on failure, falls back to the cache the same way Shop.js
  // does — only when there's nothing already on screen from a prior
  // successful load (isRefreshOfLoaded), otherwise a plain refreshError
  // banner is enough since the list is already showing something real.
  const loadInitial = useCallback(async (isRefreshOfLoaded = false) => {
    try {
      const data = await fetchPage(null);
      if (mountedRef.current) {
        setPosts(data.posts);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setError(null);
        setLoadMoreError(null);
        setRefreshError(null);
        setUsingCache(false);
      }
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      if (isRefreshOfLoaded) {
        if (mountedRef.current) setRefreshError(err.message);
        return;
      }
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!mountedRef.current) return;
      if (cached) {
        const data = JSON.parse(cached);
        setPosts(data.posts);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setUsingCache(true);
        setError(null);
        setLoadMoreError(null);
        setRefreshError(null);
      } else {
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
    if (mountedRef.current) setRefreshing(true);
    await loadInitial(posts.length > 0);
    if (mountedRef.current) setRefreshing(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await fetchPage(cursor);
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      // Never blank the already-loaded list on a loadMore failure.
      setLoadMoreError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const openArticle = (post) => navigation.navigate('Article', { post });

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />
      }
    >
      <View style={styles.body}>
        <Text style={styles.subtitle}>Quite Blogly — Frank's own writing, read right here.</Text>

        {usingCache ? (
          <Text style={styles.cacheNotice}>Showing last saved version — may be out of date.</Text>
        ) : null}

        {loading ? (
          <LoadingState message="Loading posts…" />
        ) : error ? (
          <ErrorState message="Couldn't load the blog. Check your connection and try again." onRetry={() => loadInitial()} />
        ) : posts.length === 0 ? (
          <EmptyState message="No posts yet — check back soon." />
        ) : (
          <>
            <FeaturedCard post={featured} onPress={() => openArticle(featured)} />

            <View style={styles.divider} />

            <View style={styles.list}>
              {rest.map((post) => (
                <PostRow key={post.id} post={post} onPress={() => openArticle(post)} />
              ))}
            </View>

            {refreshError ? (
              <ErrorState message="Couldn't refresh the blog. Pull down and try again." />
            ) : null}

            {hasMore ? (
              <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator color={colors.inkMuted} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            ) : null}
            {loadMoreError ? (
              <ErrorState message="Couldn't load more posts." onRetry={loadMore} />
            ) : null}
          </>
        )}
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
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.5,
    marginBottom: spacing.md,
  },
  cacheNotice: {
    color: colors.accentGold,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredCard: {
    marginBottom: spacing.md,
  },
  featuredImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  featuredTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xxl,
    lineHeight: fontSize.xxl * 1.25,
    marginBottom: spacing.xs,
  },
  featuredMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  rowMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 3,
  },
  loadMore: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  loadMoreText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
});
