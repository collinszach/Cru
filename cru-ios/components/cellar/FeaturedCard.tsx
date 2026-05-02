import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { DrinkingWindowDot } from './DrinkingWindowDot';
import type { CellarEntry } from '@/types';
import { colors, type as type_, radius } from '@/components/ui/tokens';

interface FeaturedCardProps {
  entry: CellarEntry;
  onPress: () => void;
}

/**
 * Hero card — first in_window or peak bottle.
 * Larger vintage numeral, stats row (Score · Bottles · Drink By), PEAK badge.
 * Inspired by Monarch Money's large stat heroes + Letterboxd's film-of-the-week card.
 */
export function FeaturedCard({ entry, onPress }: FeaturedCardProps) {
  const wine = entry.wine;
  const status = entry.drinking_window_status;
  const badgeLabel = status === 'peak' ? 'PEAK' : status === 'in_window' ? 'DRINK NOW' : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard featured style={styles.card}>
        <View style={styles.inner}>
          {/* Vintage hero */}
          <Text style={styles.vintage}>{entry.vintage}</Text>
          <Text style={styles.wineName}>{wine?.name ?? '—'}</Text>
          <Text style={styles.producer}>
            {[wine?.producer?.name, wine?.appellation?.name].filter(Boolean).join(' · ')}
          </Text>

          {/* PEAK / DRINK NOW badge */}
          {badgeLabel && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          )}

          {/* Window dot */}
          <View style={styles.dotWrapper}>
            <DrinkingWindowDot status={entry.drinking_window_status} />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>×{entry.quantity}</Text>
              <Text style={styles.statLabel}>Bottles</Text>
            </View>
            {entry.drink_by && (
              <View style={styles.stat}>
                <Text style={styles.statVal}>{entry.drink_by}</Text>
                <Text style={styles.statLabel}>Drink By</Text>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 9,
  },
  inner: {
    padding: 16,
  },
  vintage: {
    ...type_.vintageHero,
  },
  wineName: {
    ...type_.wineNameFeatured,
    marginTop: 4,
  },
  producer: {
    ...type_.producer,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: 14,
    right: 30,
    backgroundColor: colors.garnetDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
    borderRadius: radius.badge,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: {
    ...type_.badge,
  },
  dotWrapper: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.garnetDim,
    borderRadius: radius.stat,
    paddingVertical: 5,
    paddingHorizontal: 7,
    alignItems: 'center',
  },
  statVal: {
    ...type_.statValue,
  },
  statLabel: {
    ...type_.statLabel,
  },
});
