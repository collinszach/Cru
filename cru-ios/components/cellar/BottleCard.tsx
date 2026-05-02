import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { DrinkingWindowDot } from './DrinkingWindowDot';
import type { CellarEntry } from '@/types';
import { colors, type as type_, spacing } from '@/components/ui/tokens';

interface BottleCardProps {
  entry: CellarEntry;
  onPress: () => void;
  onSwipeConsume?: () => void;
}

/**
 * Standard cellar list card.
 * Layout inspired by Things 3 task rows: clean, scannable, action on swipe.
 * Vintage year = large garnet numeral (hero number, like Dark Sky temp).
 * Drinking window dot top-right, quantity badge bottom-right if > 1.
 */
export function BottleCard({ entry, onPress }: BottleCardProps) {
  const wine = entry.wine;
  const producerName = wine?.producer?.name ?? '';
  const appellationName = wine?.appellation?.name ?? '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.card}>
        <View style={styles.inner}>
          {/* Vintage hero numeral */}
          <Text style={styles.vintage}>{entry.vintage}</Text>

          {/* Wine info */}
          <Text style={styles.wineName} numberOfLines={1}>
            {wine?.name ?? '—'}
          </Text>
          <Text style={styles.producer} numberOfLines={1}>
            {[producerName, appellationName].filter(Boolean).join(' · ')}
          </Text>

          {/* Drinking window dot */}
          <View style={styles.dotWrapper}>
            <DrinkingWindowDot status={entry.drinking_window_status} />
          </View>

          {/* Quantity badge */}
          {entry.quantity > 1 && (
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyText}>×{entry.quantity}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />
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
    padding: 14,
    paddingBottom: 12,
    paddingRight: 28,
  },
  vintage: {
    ...type_.vintageCard,
  },
  wineName: {
    ...type_.wineName,
    marginTop: 3,
  },
  producer: {
    ...type_.producer,
    marginTop: 1,
  },
  dotWrapper: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  qtyBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
  },
  qtyText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.dividerGarnet,
    marginTop: 10,
  },
});
