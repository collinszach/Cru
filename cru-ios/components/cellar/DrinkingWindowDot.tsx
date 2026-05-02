import { View, StyleSheet } from 'react-native';
import type { DrinkingWindowStatus } from '@/types';
import { colors } from '@/components/ui/tokens';

interface DrinkingWindowDotProps {
  status: DrinkingWindowStatus | undefined;
}

/**
 * 8px status dot. Top-right corner of every bottle card.
 * Green = peak/in_window. Gold = approaching. Muted = hold/not_ready.
 */
export function DrinkingWindowDot({ status }: DrinkingWindowDotProps) {
  const dotStyle = getDotStyle(status);
  return <View style={[styles.dot, dotStyle]} />;
}

function getDotStyle(status: DrinkingWindowStatus | undefined) {
  switch (status) {
    case 'peak':
    case 'in_window':
      return {
        backgroundColor: colors.windowPeak,
        shadowColor: colors.windowPeakGlow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
      };
    case 'approaching':
      return {
        backgroundColor: colors.windowApproaching,
        shadowColor: colors.windowApproachingGlow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
      };
    default:
      return { backgroundColor: colors.windowHold };
  }
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
