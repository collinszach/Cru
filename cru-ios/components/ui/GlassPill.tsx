import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from './tokens';

interface GlassPillProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Filter pill used in FilterPillBar.
 * Active: garnet fill. Inactive: frosted glass.
 * Matches Things 3 tag-filter behaviour.
 */
export function GlassPill({ label, active = false, onPress, style }: GlassPillProps) {
  if (active) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.active, style]} activeOpacity={0.8}>
        <Text style={styles.activeText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <BlurView intensity={12} tint="light" style={[styles.inactiveWrap, style]}>
      <TouchableOpacity onPress={onPress} style={styles.inactiveTouchable} activeOpacity={0.7}>
        <Text style={styles.inactiveText}>{label}</Text>
      </TouchableOpacity>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  active: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.garnet,
    shadowColor: colors.garnetShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  inactiveWrap: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassPillBorder,
    overflow: 'hidden',
  },
  inactiveTouchable: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  inactiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkMuted,
    letterSpacing: 0.2,
  },
});
