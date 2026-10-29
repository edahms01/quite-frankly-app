import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ImageIcon } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { listablePosts } from '../../lib/substackPosts';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const CACHE_KEY = 'substack_posts_cache';

// Local copies of WritingBlog.js's helpers (the repo's convention is a
// per-screen copy, not a shared util).
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

function ImagePlaceholder({ style }) {
  return (
    <View style={[styles.imagePlaceholder, style]}>
      <ImageIcon color={colors.inkMuted} size={18} />
    </View>
  );
}

// A row = the Blog row (free posts only: paid posts are filtered out by listablePosts before they get here).
function PostRow({ post, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      {post.heroImageUrl ? (
        <Image source={{ uri: post.heroImageUrl }} style={styles.rowThumb} resizeMode="cover" />
      ) : (
        <ImagePlaceholder style={styles.rowThumb} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>{post.title}</Text>
        <View style={styles.rowMetaLine}>
          <Text style={styles.rowMeta}>{metaLine(post)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function WritingSubstack({ navigation }) {
  // No pagination: get-substack-posts returns the whole list in one response
  // ({ nextCursor: null, hasMore: false }). Otherwise the same shape as
  // WritingBlog.js: mountedRef guard, loadInitial shared by mount + pull to
  // refresh, AsyncStorage cache fallback only when nothing is on screen yet.
  const [allPosts, setPosts] = useState([]);
  const posts = listablePosts(allPosts);      // paid posts are never shown
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [usingCache, setUsingCache] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPosts = async () => {
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-substack-posts`);
    if (!response.ok) throw new Error(`Substack posts request failed: ${response.status}`);
    return response.json();
  };

  const loadInitial = useCallback(async (isRefreshOfLoaded = false) => {
    try {
      const data = await fetchPosts();
      if (mountedRef.current) {
        setPosts(data.posts);
        setError(null);
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
        setPosts(JSON.parse(cached).posts);
        setUsingCache(true);
        setError(null);
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

  const openArticle = (post) => navigation.navigate('Article', { post, source: 'substack' });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />
      }
    >
      <View style={styles.body}>
        {usingCache ? (
          <Text style={styles.cacheNotice}>Showing last saved version — may be out of date.</Text>
        ) : null}

        {loading ? (
          <LoadingState message="Loading posts…" />
        ) : error ? (
          <ErrorState message="Couldn't load Substack. Check your connection and try again." onRetry={() => loadInitial()} />
        ) : posts.length === 0 ? (
          <EmptyState message="New writing from Frank will show up here." />
        ) : (
          <>
            <View style={styles.list}>
              {posts.map((post) => (
                <PostRow key={post.id} post={post} onPress={() => openArticle(post)} />
              ))}
            </View>
            {refreshError ? (
              <ErrorState message="Couldn't refresh Substack. Pull down and try again." />
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
  cacheNotice: {
    color: colors.accentGold,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    backgroundColor: colors.bgRaised2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
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
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rowMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
