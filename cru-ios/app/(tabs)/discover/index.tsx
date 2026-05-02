import { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { discoverApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { GlassCard } from '@/components/ui/GlassCard';
import { NetworkBanner } from '@/components/ui/NetworkBanner';
import type { RecommendationResult } from '@/types';
import { colors, type as type_, radius } from '@/components/ui/tokens';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const getToken = useToken();
  const [nlQuery, setNlQuery] = useState('');
  const [nlResults, setNlResults] = useState<RecommendationResult[] | null>(null);

  const { data: recommendations = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['discover', 'recommendations'],
    queryFn: async () => {
      const token = await getToken();
      return discoverApi.recommendations(token, { limit: 20 });
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — recommendations are expensive
  });

  const nlMutation = useMutation({
    mutationFn: async (query: string) => {
      const token = await getToken();
      return discoverApi.naturalLanguageSearch(token, query);
    },
    onSuccess: (data) => setNlResults(data),
  });

  const handleSearch = () => {
    if (nlQuery.trim().length < 3 || nlMutation.isPending) return;
    nlMutation.mutate(nlQuery.trim());
  };

  const clearSearch = () => {
    setNlQuery('');
    setNlResults(null);
    nlMutation.reset();
  };

  const displayResults = nlResults ?? recommendations;
  const isEmpty = !isLoading && recommendations.length < 3;

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      <NetworkBanner />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.meta}>Based on your taste profile</Text>
      </View>

      {/* NL search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.inkMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find me something like the 2015 Pichon Baron…"
            placeholderTextColor={colors.inkSubtle}
            value={nlQuery}
            onChangeText={setNlQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {nlResults && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
            </TouchableOpacity>
          )}
        </View>
        {nlQuery.length >= 3 && !nlResults && (
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleSearch}
            disabled={nlMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.searchBtnText}>
              {nlMutation.isPending ? 'Searching…' : 'Search'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.garnet} />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Not enough notes yet</Text>
          <Text style={styles.emptyBody}>
            Log at least 3 tasting notes and your recommendations will appear here, calibrated to your palate.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.garnet} />
          }
          showsVerticalScrollIndicator={false}
        >
          {nlResults && (
            <Text style={styles.nlResultsLabel}>
              {nlResults.length} results for "{nlQuery}"
            </Text>
          )}

          {displayResults.filter(rec => rec.wine != null).map((rec, i) => (
            <RecommendationCard key={rec.wine.id + i} rec={rec} />
          ))}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

function RecommendationCard({ rec }: { rec: RecommendationResult }) {
  const router = useRouter();
  const pct = Math.round(rec.similarity_score * 100);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/(tabs)/discover/wine/${rec.wine.id}`)}
    >
    <GlassCard style={styles.recCard}>
      <View style={styles.recInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recName} numberOfLines={1}>{rec.wine.full_name}</Text>
          <Text style={styles.recRegion}>
            {rec.wine.appellation?.name ?? rec.wine.appellation_id}
          </Text>
          {rec.reason && (
            <Text style={styles.recReason} numberOfLines={2}>{rec.reason}</Text>
          )}
        </View>
        <View style={styles.pctPill}>
          <Text style={styles.pctText}>{pct}%</Text>
        </View>
      </View>
    </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  title: { ...type_.screenTitle },
  meta: { ...type_.screenMeta, marginTop: 3 },
  searchContainer: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },
  searchBtn: {
    marginTop: 8,
    backgroundColor: colors.garnet,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  searchBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { ...type_.wineName, fontSize: 17, textAlign: 'center', marginBottom: 12 },
  emptyBody: { ...type_.caption, textAlign: 'center', lineHeight: 20, color: colors.inkMuted },
  content: { paddingTop: 12, paddingHorizontal: 14 },
  nlResultsLabel: {
    ...type_.caption,
    color: colors.gold,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
  },
  recCard: { padding: 14, marginBottom: 9 },
  recInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  recName: { ...type_.wineName, fontSize: 14 },
  recRegion: { ...type_.producer, marginTop: 2 },
  recReason: { ...type_.caption, fontStyle: 'italic', marginTop: 6, lineHeight: 17 },
  pctPill: {
    backgroundColor: colors.garnetDim,
    borderRadius: radius.stat,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 46,
  },
  pctText: { fontSize: 13, fontWeight: '700', color: colors.garnet },
});
