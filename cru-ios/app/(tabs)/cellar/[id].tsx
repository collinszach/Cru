import { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cellarApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { ConsumptionSheet } from '@/components/cellar/ConsumptionSheet';
import { DrinkingWindowDot } from '@/components/cellar/DrinkingWindowDot';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors, type as type_, spacing, radius } from '@/components/ui/tokens';

export default function BottleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const getToken = useToken();
  const qc = useQueryClient();
  const [consumeVisible, setConsumeVisible] = useState(false);

  const { data: entry, isLoading } = useQuery({
    queryKey: ['cellar', id],
    queryFn: async () => {
      const token = await getToken();
      return cellarApi.get(token, id);
    },
  });

  const consumeMutation = useMutation({
    mutationFn: async (data: { occasion?: string; notes?: string }) => {
      const token = await getToken();
      return cellarApi.consume(token, id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cellar'] });
      setConsumeVisible(false);
      router.back();
    },
  });

  if (isLoading || !entry) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.loading}>
        <ActivityIndicator color={colors.garnet} />
      </LinearGradient>
    );
  }

  const wine = entry.wine;
  const statusLabel: Record<string, string> = {
    peak: 'Peak',
    in_window: 'Drinking Window',
    approaching: 'Approaching',
    not_ready: 'Not Ready',
    past_peak: 'Past Peak',
    declining: 'Declining',
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      {/* Back button */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.garnet} />
          <Text style={styles.backLabel}>Cellar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <View style={styles.hero}>
          <Text style={styles.vintageHero}>{entry.vintage}</Text>
          <TouchableOpacity
            onPress={() => wine && router.push(`/(tabs)/discover/wine/${entry.wine_id}`)}
            activeOpacity={0.7}
            disabled={!wine}
          >
            <Text style={styles.wineName}>{wine?.name}</Text>
          </TouchableOpacity>
          <Text style={styles.producer}>
            {[wine?.producer?.name, wine?.appellation?.name].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* Drinking window */}
        {entry.drinking_window_status && (
          <GlassCard style={styles.section}>
            <View style={styles.windowRow}>
              <DrinkingWindowDot status={entry.drinking_window_status} />
              <Text style={styles.windowStatus}>
                {statusLabel[entry.drinking_window_status] ?? entry.drinking_window_status}
              </Text>
            </View>
            {entry.drink_recommendation && (
              <Text style={styles.windowRec}>{entry.drink_recommendation}</Text>
            )}
            {(entry.drink_from || entry.drink_by) && (
              <Text style={styles.windowRange}>
                {entry.drink_from}–{entry.drink_by}
              </Text>
            )}
          </GlassCard>
        )}

        {/* Cellar info */}
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Cellar Info</Text>
          <InfoRow label="Quantity" value={`${entry.quantity} bottle${entry.quantity !== 1 ? 's' : ''}`} />
          {entry.format && <InfoRow label="Format" value={entry.format} />}
          {entry.bin_location && <InfoRow label="Bin" value={entry.bin_location} />}
          {entry.purchase_price && (
            <InfoRow
              label="Purchase"
              value={`${entry.currency} ${entry.purchase_price.toFixed(0)}`}
            />
          )}
          {entry.purchase_date && <InfoRow label="Date" value={entry.purchase_date.slice(0, 10)} />}
        </GlassCard>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGarnet, consumeMutation.isPending && { opacity: 0.6 }]}
            onPress={() => setConsumeVisible(true)}
            disabled={consumeMutation.isPending}
            activeOpacity={0.8}
          >
            <Ionicons name="wine" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Consume Bottle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGlass]}
            onPress={() => router.push({ pathname: '/(tabs)/journal/new', params: { cellar_entry_id: id } })}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={18} color={colors.garnet} />
            <Text style={[styles.actionBtnText, { color: colors.garnet }]}>Add Tasting Note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConsumptionSheet
        visible={consumeVisible}
        onClose={() => setConsumeVisible(false)}
        onConfirm={(data) => consumeMutation.mutate(data)}
        wineName={wine?.name ?? ''}
        isPending={consumeMutation.isPending}
      />
    </LinearGradient>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { ...type_.caption, color: colors.inkMuted },
  value: { ...type_.caption, color: colors.ink, fontWeight: '500' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontSize: 17, color: colors.garnet, fontWeight: '400' },
  content: { paddingTop: 8 },
  hero: { paddingHorizontal: 18, paddingBottom: 16 },
  vintageHero: { ...type_.vintageHero, fontSize: 56, letterSpacing: -4 },
  wineName: { ...type_.wineNameFeatured, fontSize: 18, marginTop: 4 },
  producer: { ...type_.producer, fontSize: 13, marginTop: 2 },
  section: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  windowStatus: { ...type_.wineName, fontSize: 14 },
  windowRec: { ...type_.body, fontSize: 13, color: colors.inkMuted, lineHeight: 18 },
  windowRange: { ...type_.caption, color: colors.gold, marginTop: 4, fontWeight: '600' },
  actions: { paddingHorizontal: 14, gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  actionBtnGarnet: { backgroundColor: colors.garnet },
  actionBtnGlass: {
    backgroundColor: colors.garnetDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
