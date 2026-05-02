import { useState, useMemo } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cellarApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { FeaturedCard } from '@/components/cellar/FeaturedCard';
import { BottleCard } from '@/components/cellar/BottleCard';
import { FilterPillBar, type CellarFilter } from '@/components/cellar/FilterPillBar';
import { NetworkBanner } from '@/components/ui/NetworkBanner';
import type { CellarEntry, DrinkingWindowStatus } from '@/types';
import { colors, type as type_, spacing } from '@/components/ui/tokens';

const WINDOW_ORDER: DrinkingWindowStatus[] = [
  'peak', 'in_window', 'approaching', 'not_ready', 'past_peak', 'declining',
];

export default function CellarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<CellarFilter>('all');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['cellar'],
    queryFn: async () => {
      const token = await getToken();
      return cellarApi.list(token, { status: 'in_cellar', per_page: 100 });
    },
  });

  const entries = data?.items ?? [];

  // Derive unique regions for dynamic filter pills
  const regions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      const r = e.wine?.appellation?.region;
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [entries]);

  // Filter + sort entries
  const filtered = useMemo(() => {
    let list = entries;
    if (activeFilter === 'all') {
      // default: sort by drinking window urgency
    } else if (['in_window', 'approaching', 'not_ready', 'peak'].includes(activeFilter)) {
      list = entries.filter(e => e.drinking_window_status === activeFilter);
    } else {
      // region filter
      list = entries.filter(e => e.wine?.appellation?.region === activeFilter);
    }

    return [...list].sort((a, b) => {
      const ai = WINDOW_ORDER.indexOf(a.drinking_window_status ?? 'not_ready');
      const bi = WINDOW_ORDER.indexOf(b.drinking_window_status ?? 'not_ready');
      return ai - bi;
    });
  }, [entries, activeFilter]);

  // Featured = first peak or in_window entry, only shown when viewing all bottles
  const { featured, rest } = useMemo(() => {
    const feat = activeFilter === 'all'
      ? filtered.find(e => e.drinking_window_status === 'peak' || e.drinking_window_status === 'in_window')
      : undefined;
    return { featured: feat, rest: filtered.filter(e => e.id !== feat?.id) };
  }, [filtered, activeFilter]);

  const totalBottles = entries.reduce((sum, e) => sum + e.quantity, 0);
  const regionsCount = regions.length;

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.loading}>
        <ActivityIndicator color={colors.garnet} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      <NetworkBanner />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>My Cellar</Text>
        <Text style={styles.meta}>
          {activeFilter === 'all'
            ? `${totalBottles} bottles · ${regionsCount} regions`
            : `${filtered.reduce((s, e) => s + e.quantity, 0)} of ${totalBottles} bottles`}
        </Text>
      </View>

      {/* Filter pills */}
      <FilterPillBar
        active={activeFilter}
        regions={regions}
        onChange={setActiveFilter}
      />

      {/* Cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.garnet}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <Text style={styles.empty}>No bottles match this filter.</Text>
        )}

        {featured && (
          <FeaturedCard
            entry={featured}
            onPress={() => router.push(`/(tabs)/cellar/${featured.id}`)}
          />
        )}

        {rest.map(entry => (
          <BottleCard
            key={entry.id}
            entry={entry}
            onPress={() => router.push(`/(tabs)/cellar/${entry.id}`)}
          />
        ))}
      </ScrollView>

      {/* FAB — Add bottle (Things 3 style) */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => router.push('/(tabs)/cellar/intake')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  title: { ...type_.screenTitle },
  meta: { ...type_.screenMeta, marginTop: 3 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  empty: {
    ...type_.caption,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.garnet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.garnetShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
});
