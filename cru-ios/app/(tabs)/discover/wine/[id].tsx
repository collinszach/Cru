import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { winesApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors, type as type_, radius } from '@/components/ui/tokens';
import type { VintageQuality } from '@/types';

type VintageRow = VintageQuality;

export default function WineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();

  const { data: wine, isLoading: wineLoading, isError: wineError } = useQuery({
    queryKey: ['wine', id],
    queryFn: async () => {
      const token = await getToken();
      return winesApi.get(token, id);
    },
    enabled: !!id,
  });

  const { data: vintages, isLoading: vintagesLoading } = useQuery({
    queryKey: ['wine', id, 'vintages'],
    queryFn: async () => {
      const token = await getToken();
      return winesApi.vintages(token, id);
    },
    enabled: !!id,
  });

  const handleAddToCellar = () => {
    if (!wine) return;
    router.push(
      `/(tabs)/cellar/intake?wine_id=${wine.id}&wine_name=${encodeURIComponent(wine.full_name)}`,
    );
  };

  // ── Loading / error states ────────────────────────────────────────────────────
  if (wineLoading) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
        <View style={[styles.loadingCenter, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.garnet} size="large" />
        </View>
      </LinearGradient>
    );
  }

  if (wineError || !wine) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
        <View style={[styles.loadingCenter, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>Could not load wine.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────────
  const styleBadge = [
    wine.style ? capitalize(wine.style) : null,
    wine.color ? capitalize(wine.color) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const appellationLine = [
    wine.appellation?.name,
    wine.appellation?.region,
    wine.appellation?.country,
  ]
    .filter(Boolean)
    .join(' · ');

  const grapeList = wine.primary_grapes
    .map((g) => g.grape)
    .filter(Boolean)
    .join(', ');

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.garnet} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <GlassCard featured style={styles.heroCard}>
          <Text style={styles.heroName}>{wine.full_name}</Text>

          {wine.producer?.name ? (
            <Text style={styles.producerName}>{wine.producer.name}</Text>
          ) : null}

          {appellationLine ? (
            <Text style={styles.appellationLine}>{appellationLine}</Text>
          ) : null}

          <View style={styles.badgeRow}>
            {styleBadge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{styleBadge}</Text>
              </View>
            ) : null}

            {wine.classification ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{wine.classification}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            {wine.alcohol_typical !== null && wine.alcohol_typical !== undefined ? (
              <Text style={styles.metaItem}>{wine.alcohol_typical}% ABV</Text>
            ) : null}
            {grapeList ? (
              <Text style={styles.metaItem}>{grapeList}</Text>
            ) : null}
          </View>
        </GlassCard>

        {/* Description */}
        {wine.description ? (
          <GlassCard style={styles.sectionCard}>
            <SectionHeader>About</SectionHeader>
            <Text style={styles.descriptionText}>{wine.description}</Text>
          </GlassCard>
        ) : null}

        {/* Vintage chart */}
        <GlassCard style={styles.sectionCard}>
          <SectionHeader>Vintage Chart</SectionHeader>

          {vintagesLoading ? (
            <ActivityIndicator color={colors.garnet} style={styles.vintageLoader} />
          ) : vintages && vintages.length > 0 ? (
            vintages.map((row) => (
              <VintageRow key={row.vintage} row={row} />
            ))
          ) : (
            <Text style={styles.emptyText}>
              No vintage chart data for this appellation.
            </Text>
          )}
        </GlassCard>
      </ScrollView>

      {/* Fixed "Add to Cellar" button */}
      <View style={[styles.addBarOuter, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddToCellar}
          activeOpacity={0.82}
        >
          <Ionicons name="add" size={18} color="#fff" style={styles.addIcon} />
          <Text style={styles.addBtnText}>Add to Cellar</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

function VintageRow({ row }: { row: VintageRow }) {
  const windowStr =
    row.drinking_from && row.drinking_to
      ? `${row.drinking_from}–${row.drinking_to}`
      : null;

  return (
    <View style={styles.vintageRow}>
      {/* Year */}
      <Text style={styles.vintageYear}>{row.vintage}</Text>

      {/* Score + descriptor */}
      <View style={styles.vintageMiddle}>
        {row.score !== null ? (
          <Text style={styles.vintageScore}>{row.score} pt</Text>
        ) : null}
        {row.descriptor ? (
          <Text style={styles.vintageDescriptor}>{row.descriptor}</Text>
        ) : null}
        {windowStr ? (
          <Text style={styles.vintageWindow}>{windowStr}</Text>
        ) : null}
      </View>

      {/* User note indicator */}
      {row.user_notes > 0 ? (
        <View style={styles.noteIndicator}>
          <Ionicons name="document-text-outline" size={12} color={colors.garnet} />
          <Text style={styles.noteCount}>{row.user_notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: { ...type_.caption, color: colors.inkMuted },
  backLinkBtn: { marginTop: 8 },
  backLinkText: { color: colors.garnet, fontSize: 14 },

  navBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  backBtn: { alignSelf: 'flex-start' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  heroCard: { padding: 20 },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: 4,
  },
  producerName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.inkMuted,
    marginBottom: 2,
  },
  appellationLine: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: colors.garnetDim,
    borderRadius: radius.badge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.garnet,
    letterSpacing: 0.3,
  },
  metaRow: { gap: 4 },
  metaItem: {
    fontSize: 12,
    color: colors.inkMuted,
  },

  sectionCard: { padding: 16 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  descriptionText: {
    ...type_.body,
    lineHeight: 22,
  },

  vintageLoader: { marginVertical: 20 },
  emptyText: {
    ...type_.caption,
    color: colors.inkSubtle,
    textAlign: 'center',
    paddingVertical: 16,
  },

  vintageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  vintageYear: {
    fontSize: 28,
    fontWeight: '200',
    color: colors.garnet,
    letterSpacing: -1.5,
    width: 72,
  },
  vintageMiddle: {
    flex: 1,
    gap: 2,
  },
  vintageScore: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  vintageDescriptor: {
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  vintageWindow: {
    fontSize: 11,
    color: colors.inkSubtle,
  },
  noteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: colors.garnetDim,
    borderRadius: radius.badge,
  },
  noteCount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.garnet,
  },

  addBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.tabBarHeader,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.tabBarHeaderBorder,
  },
  addBtn: {
    backgroundColor: colors.garnet,
    borderRadius: radius.pill,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: { marginRight: 6 },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
