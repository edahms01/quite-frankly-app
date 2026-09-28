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
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, Image as ImageIcon, Mail } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const PAGE_SIZE = 15;
const ALL_CATEGORY = null; // sentinel for "no category filter" (the "All" chip)

// Dates and month grouping both read off the same UTC slice as the read
// function's own month bucketing (get-newsletter-items.js's monthOf) --
// Eric's explicit addition, so a row can never show under a different
// month than the one it's grouped under. WritingBlog.js's formatPostDate
// uses the device's local timezone instead; not reused here on purpose.
function formatItemDateUTC(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function metaLine(post) {
  const date = formatItemDateUTC(post.publishedAt);
  const minutes = post.readMinutes ? `${post.readMinutes} min read` : null;
  return [date, minutes].filter(Boolean).join(' · ');
}

// yyyyMm is always "YYYY-MM" (get-newsletter-items.js's monthOf output) --
// construct the UTC-midnight date directly from the parts rather than
// `new Date(yyyyMm)`, whose parsing behavior for a bare "YYYY-MM" string is
// inconsistent across engines.
function monthDateUTC(yyyyMm) {
  const [year, month] = yyyyMm.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function monthLabel(yyyyMm) {
  const d = monthDateUTC(yyyyMm);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    year: String(d.getUTCFullYear()),
  };
}

function monthLabelFull(yyyyMm) {
  const d = monthDateUTC(yyyyMm);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function ImagePlaceholder({ style, iconSize }) {
  return (
    <View style={[styles.imagePlaceholder, style]}>
      <ImageIcon color={colors.inkMuted} size={iconSize} />
    </View>
  );
}

function CategoryChips({ categories, active, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsRowContent}>
      <TouchableOpacity
        style={[styles.chip, active === ALL_CATEGORY && styles.chipSelected]}
        onPress={() => onSelect(ALL_CATEGORY)}
      >
        <Text style={[styles.chipText, active === ALL_CATEGORY && styles.chipTextSelected]}>All</Text>
      </TouchableOpacity>
      {categories.map((c) => (
        <TouchableOpacity
          key={c.value}
          style={[styles.chip, active === c.value && styles.chipSelected]}
          onPress={() => onSelect(c.value)}
        >
          <Text style={[styles.chipText, active === c.value && styles.chipTextSelected]}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function MonthCards({ months, active, onSelect }) {
  if (months.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthsRow} contentContainerStyle={styles.monthsRowContent}>
      {months.map((m) => {
        const { month, year } = monthLabel(m);
        const selected = active === m;
        return (
          <TouchableOpacity
            key={m}
            style={[styles.monthCard, selected && styles.monthCardSelected]}
            onPress={() => onSelect(selected ? null : m)}
          >
            <Text style={[styles.monthCardMonth, selected && styles.monthCardMonthSelected]}>{month}</Text>
            <Text style={styles.monthCardYear}>{year}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
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
        <View style={styles.rowMetaLine}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{post.category}</Text>
          </View>
          <Text style={styles.rowMeta}>{formatItemDateUTC(post.publishedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function BulletinRow({ bulletin, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.rowThumb, styles.bulletinThumb]}>
        <Mail color={colors.accentGold} size={22} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{bulletin.title}</Text>
        <View style={styles.rowMetaLine}>
          <View style={[styles.categoryPill, styles.bulletinPill]}>
            <Text style={styles.categoryPillText}>Bulletin</Text>
          </View>
          <Text style={styles.rowMeta}>{formatItemDateUTC(bulletin.publishedAt)}</Text>
        </View>
      </View>
      <ExternalLink color={colors.inkMuted} size={16} />
    </TouchableOpacity>
  );
}

export default function WritingNewsletter({ navigation }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [months, setMonths] = useState([]);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [activeMonth, setActiveMonth] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, monthRes] = await Promise.all([
          fetch(`${API_BASE_URL}/.netlify/functions/get-newsletter-items?mode=categories`),
          fetch(`${API_BASE_URL}/.netlify/functions/get-newsletter-items?mode=months`),
        ]);
        const catData = catRes.ok ? await catRes.json() : { categories: [] };
        const monthData = monthRes.ok ? await monthRes.json() : { months: [] };
        if (mountedRef.current) {
          setCategories(catData.categories ?? []);
          setMonths(monthData.months ?? []);
        }
      } catch {
        // Chips/month row are a filtering aid, not load-bearing -- a failed
        // fetch here just means "All, no month row" rather than blocking
        // the list itself.
      }
    })();
  }, []);

  const fetchPage = async (cursorParam, category, month) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursorParam) params.set('cursor', cursorParam);
    if (category) params.set('category', category);
    if (month) params.set('month', month);
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/get-newsletter-items?${params.toString()}`);
    if (!response.ok) throw new Error(`Newsletter items request failed: ${response.status}`);
    return response.json();
  };

  const loadInitial = useCallback(async (category, month, isRefreshOfLoaded = false) => {
    try {
      const data = await fetchPage(null, category, month);
      if (mountedRef.current) {
        setItems(data.items);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setError(null);
        setLoadMoreError(null);
        setRefreshError(null);
      }
    } catch (err) {
      if (isRefreshOfLoaded) {
        if (mountedRef.current) setRefreshError(err.message);
        return;
      }
      if (mountedRef.current) setError(err.message);
    }
  }, []);

  // Re-loads from scratch (cursor reset) whenever a filter changes, same
  // as the initial mount load -- Blog has no filters to reset against, so
  // this is the one real logic addition beyond WritingBlog.js's pattern.
  useEffect(() => {
    setLoading(true);
    (async () => {
      await loadInitial(activeCategory, activeMonth);
      if (mountedRef.current) setLoading(false);
    })();
  }, [activeCategory, activeMonth, loadInitial]);

  const onRefresh = async () => {
    if (mountedRef.current) setRefreshing(true);
    await loadInitial(activeCategory, activeMonth, items.length > 0);
    if (mountedRef.current) setRefreshing(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await fetchPage(cursor, activeCategory, activeMonth);
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      // Never blank the already-loaded list, and never claim hasMore is
      // false on a failed loadMore -- the brief's explicit requirement.
      setLoadMoreError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const openItem = (item) => {
    if (item.type === 'bulletin') {
      WebBrowser.openBrowserAsync(item.url, { dismissButtonStyle: 'close' });
    } else {
      navigation.navigate('Article', { post: item, source: 'newsletter' });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />}
    >
      <CategoryChips categories={categories} active={activeCategory} onSelect={setActiveCategory} />
      <MonthCards months={months} active={activeMonth} onSelect={setActiveMonth} />

      <View style={styles.body}>
        {activeMonth ? (
          <View style={styles.filterHeader}>
            <Text style={styles.filterHeaderText}>{monthLabelFull(activeMonth)}</Text>
            <TouchableOpacity onPress={() => setActiveMonth(null)} hitSlop={8}>
              <Text style={styles.clearText}>Clear ✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <LoadingState message="Loading newsletter…" />
        ) : error ? (
          <ErrorState message="Couldn't load the newsletter. Check your connection and try again." onRetry={() => loadInitial(activeCategory, activeMonth)} />
        ) : items.length === 0 ? (
          <EmptyState message="No posts for this month/category yet." />
        ) : (
          <>
            <View style={styles.list}>
              {items.map((item) => (
                item.type === 'bulletin' ? (
                  <BulletinRow key={`bulletin:${item.id}`} bulletin={item} onPress={() => openItem(item)} />
                ) : (
                  <PostRow key={`post:${item.id}`} post={item} onPress={() => openItem(item)} />
                )
              ))}
            </View>

            {refreshError ? (
              <ErrorState message="Couldn't refresh the newsletter. Pull down and try again." />
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
  chipsRow: {
    flexGrow: 0,
  },
  chipsRowContent: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  chip: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: colors.accentGold,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkPrimary,
  },
  chipTextSelected: {
    color: '#121014',
    fontWeight: '700',
  },
  monthsRow: {
    flexGrow: 0,
  },
  monthsRowContent: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: spacing.md,
  },
  monthCard: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: '#2a2422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCardSelected: {
    borderWidth: 2,
    borderColor: colors.accentGold,
  },
  monthCardMonth: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.inkPrimary,
  },
  monthCardMonthSelected: {
    color: colors.accentGold,
  },
  monthCardYear: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  filterHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkPrimary,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceLine,
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
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  bulletinThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLine,
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
    marginTop: 3,
  },
  categoryPill: {
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.lg,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  bulletinPill: {
    borderColor: colors.inkMuted,
  },
  categoryPillText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  rowMeta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
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
