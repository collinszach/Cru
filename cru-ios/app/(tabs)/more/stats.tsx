import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors, type as type_, radius } from '@/components/ui/tokens';
import { statsApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import type { CellarStats } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: string;
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

interface AccuracyRowProps {
  label: string;
  pct: number;
}

function AccuracyRow({ label, pct }: AccuracyRowProps) {
  const displayPct = Math.round(pct);
  return (
    <View style={styles.accuracyRow}>
      <Text style={styles.accuracyLabel}>{label}</Text>
      <View style={styles.accuracyBarTrack}>
        <View style={[styles.accuracyBarFill, { width: `${displayPct}%` }]} />
      </View>
      <Text style={styles.accuracyPct}>{displayPct}%</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: async (): Promise<CellarStats> => statsApi.dashboard(await getToken()),
  });

  const { data: regions, isLoading: regionsLoading } = useQuery({
    queryKey: ['stats', 'regions'],
    queryFn: async () => statsApi.regionsBreakdown(await getToken()),
  });

  const { data: blindAccuracy, isLoading: blindLoading } = useQuery({
    queryKey: ['stats', 'blind'],
    queryFn: async () => statsApi.blindAccuracy(await getToken()),
  });

  const isLoading = dashLoading || regionsLoading || blindLoading;

  // Top 5 regions by count, sorted descending
  const topRegions = (regions ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxRegionCount = topRegions[0]?.count ?? 1;

  const currency = dashboard?.currency ?? 'USD';

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.garnet} />
          <Text style={styles.backLabel}>More</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Stats</Text>
        <View style={styles.navSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.garnet} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Cellar Overview ─────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Cellar Overview</Text>
          <GlassCard style={styles.card}>
            {dashboard ? (
              <View style={styles.statsGrid}>
                <StatBox
                  label="Total Bottles"
                  value={String(dashboard.total_bottles)}
                />
                <StatBox
                  label="Portfolio Value"
                  value={formatCurrency(dashboard.total_value, currency)}
                />
                <StatBox
                  label="In Window"
                  value={String(dashboard.bottles_in_window)}
                />
                <StatBox
                  label="At Peak"
                  value={String(dashboard.bottles_at_peak)}
                />
                <StatBox
                  label="Producers"
                  value={String(dashboard.producers_count)}
                />
                <StatBox
                  label="Regions"
                  value={String(dashboard.regions_count)}
                />
                <StatBox
                  label="Avg Purchase"
                  value={formatCurrency(dashboard.avg_purchase_price, currency)}
                />
                <StatBox
                  label="Approaching"
                  value={String(dashboard.bottles_approaching)}
                />
              </View>
            ) : (
              <Text style={styles.emptyText}>No cellar data yet.</Text>
            )}
          </GlassCard>

          {/* ── Top Regions ─────────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Top Regions</Text>
          <GlassCard style={styles.card}>
            {topRegions.length > 0 ? (
              <View style={styles.regionsList}>
                {topRegions.map((item, idx) => (
                  <View key={`${item.country}-${item.region}-${idx}`} style={styles.regionRow}>
                    <View style={styles.regionLabelCol}>
                      <Text style={styles.regionName} numberOfLines={1}>
                        {item.region}
                      </Text>
                      <Text style={styles.regionCountry}>{item.country}</Text>
                    </View>
                    <View style={styles.regionBarCol}>
                      <View style={styles.regionBarTrack}>
                        <View
                          style={[
                            styles.regionBarFill,
                            { width: `${(item.count / maxRegionCount) * 100}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={styles.regionCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No region data yet.</Text>
            )}
          </GlassCard>

          {/* ── Blind Tasting Accuracy ──────────────────────────────────────── */}
          {blindAccuracy && blindAccuracy.note_count >= 3 && (
            <>
              <Text style={styles.sectionHeader}>Blind Tasting Accuracy</Text>
              <GlassCard style={styles.card}>
                <Text style={styles.blindNoteCount}>
                  Based on {blindAccuracy.note_count} blind tastings
                </Text>
                <View style={styles.accuracyList}>
                  <AccuracyRow label="Overall" pct={blindAccuracy.overall_pct} />
                  <AccuracyRow label="Grape" pct={blindAccuracy.grape_pct} />
                  <AccuracyRow label="Region" pct={blindAccuracy.region_pct} />
                  <AccuracyRow label="Vintage" pct={blindAccuracy.vintage_pct} />
                </View>
              </GlassCard>
            </>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backLabel: { fontSize: 17, color: colors.garnet },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  navSpacer: { minWidth: 70 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: { paddingHorizontal: 18, paddingTop: 8 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 22,
  },

  card: { padding: 16 },

  emptyText: {
    fontSize: 13,
    color: colors.inkSubtle,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // ── Stat boxes ──────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.stat,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.garnet,
    letterSpacing: -0.8,
    marginBottom: 3,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.inkSubtle,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // ── Regions ─────────────────────────────────────────────────────────────────
  regionsList: { gap: 12 },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  regionLabelCol: { width: 110 },
  regionName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  regionCountry: {
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 1,
  },
  regionBarCol: { flex: 1 },
  regionBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139,26,46,0.1)',
    overflow: 'hidden',
  },
  regionBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.garnet,
  },
  regionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted,
    width: 28,
    textAlign: 'right',
  },

  // ── Blind accuracy ──────────────────────────────────────────────────────────
  blindNoteCount: {
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  accuracyList: { gap: 14 },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accuracyLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
    width: 60,
  },
  accuracyBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139,26,46,0.1)',
    overflow: 'hidden',
  },
  accuracyBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.garnet,
  },
  accuracyPct: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.garnet,
    width: 38,
    textAlign: 'right',
  },
});
