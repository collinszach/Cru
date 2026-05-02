import { BlurView } from 'expo-blur';
import { StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius, shadow } from './tokens';

interface GlassCardProps {
  children: React.ReactNode;
  featured?: boolean;
  style?: ViewStyle;
}

/**
 * Frosted glass card primitive.
 * `featured` = stronger opacity + larger shadow (hero card treatment).
 * All cellar and journal cards are built on top of this.
 */
export function GlassCard({ children, featured = false, style }: GlassCardProps) {
  return (
    <BlurView
      intensity={featured ? 28 : 20}
      tint="light"
      style={[
        styles.base,
        featured ? styles.featured : styles.standard,
        featured ? shadow.cardFeatured : shadow.card,
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  standard: {
    borderRadius: radius.card,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorderSubtle,
  },
  featured: {
    borderRadius: radius.cardFeatured,
    backgroundColor: colors.glassFeatured,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
});
