import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Papa from 'papaparse';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingBag } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import DestinationCard from '../../components/DestinationCard';
import ExternalRow from '../../components/ExternalRow';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPD9jF4yGWK1nP6NTVLWieooQGpWYRO0h2RVK0zBQNIoUYDLAhUmHp7Y23I9bHjWMvvqSjxLrLQl6T/pub?gid=863514589&single=true&output=csv';
const CACHE_KEY = 'shop_csv_cache';

function partition(rows) {
  const stores = rows
    .filter((r) => r.Category === 'Shop')
    .map((r) => ({ label: r.Name, url: r.URL }));
  const affiliates = rows
    .filter((r) => r.Category === 'Affiliate')
    .map((r) => ({
      title: r.Name,
      subtitle: r.Note || undefined,
      badge: r.Code || undefined,
      url: r.URL,
    }));
  return { stores, affiliates };
}

export default function Shop({ navigation }) {
  const [data, setData] = useState({ stores: [], affiliates: [] });
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    (async () => {
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);
        const csvText = await response.text();
        const { data: rows } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const partitioned = partition(rows);
        if (!cancelled) {
          setData(partitioned);
          setLoading(false);
          setUsingCache(false);
        }
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(partitioned));
      } catch (error) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!cancelled) {
          if (cached) {
            setData(JSON.parse(cached));
            setUsingCache(true);
          } else {
            // No cache to fall back to and the fetch failed — nothing to
            // render, so surface an explicit error instead of a silent
            // empty grid.
            setLoadFailed(true);
          }
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Shop" navigation={navigation} />
      <View style={styles.body}>
        {usingCache ? (
          <Text style={styles.cacheNotice}>Showing last saved version — couldn't refresh.</Text>
        ) : null}

        {loadFailed ? (
          <ErrorState
            message="Couldn't load the shop. Check your connection and try again."
            onRetry={load}
          />
        ) : (
          <>
            <Text style={styles.sectionLabel}>SHOP</Text>
            <View style={styles.grid}>
              {data.stores.map((s) => (
                <DestinationCard
                  key={s.label}
                  Icon={ShoppingBag}
                  label={s.label}
                  onPress={() => WebBrowser.openBrowserAsync(s.url)}
                />
              ))}
            </View>

            <Text style={[styles.sectionLabel, styles.affiliatesLabel]}>AFFILIATES & DISCOUNTS</Text>
            <View style={styles.list}>
              {data.affiliates.map((a) => (
                <ExternalRow
                  key={a.title}
                  title={a.title}
                  subtitle={a.subtitle}
                  badge={a.badge}
                  url={a.url}
                  inAppBrowser
                />
              ))}
            </View>
          </>
        )}

        {loading ? <LoadingState message="Loading…" /> : null}
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
    gap: spacing.md,
  },
  cacheNotice: {
    color: colors.accentGold,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
  },
  affiliatesLabel: {
    marginTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
});
