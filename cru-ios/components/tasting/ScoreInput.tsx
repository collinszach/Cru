import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ScoringSystem } from '@/types';
import { colors, radius } from '@/components/ui/tokens';

interface ScoreInputProps {
  value: number | null;
  system: ScoringSystem;
  onChange: (score: number | null) => void;
}

function getRange(system: ScoringSystem): { min: number; max: number; step: number } {
  switch (system) {
    case '100pt': return { min: 50, max: 100, step: 1 };
    case '20pt':  return { min: 10, max: 20,  step: 0.5 };
    case '5star': return { min: 1,  max: 5,   step: 0.5 };
  }
}

/**
 * Score input adapted to the user's scoring system.
 * 100pt: ±1 stepper. 20pt: ±0.5. 5star: tap stars.
 * Large tap targets optimised for mobile (Bear-style form feel).
 */
export function ScoreInput({ value, system, onChange }: ScoreInputProps) {
  const { min, max, step } = getRange(system);

  const decrement = () => {
    const current = value ?? min;
    const next = Math.max(min, current - step);
    onChange(Math.round(next * 10) / 10);
  };

  const increment = () => {
    const current = value ?? min;
    const next = Math.min(max, current + step);
    onChange(Math.round(next * 10) / 10);
  };

  if (system === '5star') {
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
            <Text style={[styles.star, (value ?? 0) >= star && styles.starFilled]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
        {value !== null && value !== undefined && (
          <TouchableOpacity onPress={() => onChange(null)} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={decrement} style={styles.stepBtn} activeOpacity={0.7}>
        <Text style={styles.stepIcon}>−</Text>
      </TouchableOpacity>

      <View style={styles.valueBox}>
        <Text style={styles.valueText}>{value !== null && value !== undefined ? value : '—'}</Text>
        <Text style={styles.systemLabel}>{system}</Text>
      </View>

      <TouchableOpacity onPress={increment} style={styles.stepBtn} activeOpacity={0.7}>
        <Text style={styles.stepIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.garnetDim,
    borderWidth: 1,
    borderColor: colors.garnetBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: { fontSize: 24, color: colors.garnet, fontWeight: '300', lineHeight: 28 },
  valueBox: { alignItems: 'center', minWidth: 64 },
  valueText: { fontSize: 36, fontWeight: '200', color: colors.garnet, letterSpacing: -2 },
  systemLabel: { fontSize: 10, color: colors.inkMuted, fontWeight: '500', letterSpacing: 0.5 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { fontSize: 32, color: colors.inkSubtle },
  starFilled: { color: colors.gold },
  clearBtn: { marginLeft: 8 },
  clearText: { fontSize: 12, color: colors.inkMuted },
});
