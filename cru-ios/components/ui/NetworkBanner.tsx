import { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors } from './tokens';

/**
 * Thin gold banner that slides down when offline.
 * Dismisses automatically when connection restores.
 * Place inside each tab's root scroll view header area.
 */
export function NetworkBanner() {
  const { isOnline, isLoaded } = useNetworkStatus();
  const translateY = useSharedValue(-40);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoaded) return;
    translateY.value = withSpring(isOnline ? -40 : 0, { damping: 18, stiffness: 180 });
  }, [isOnline, isLoaded, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.banner, { top: insets.top }, animatedStyle]}>
      <Text style={styles.text}>You're offline — showing cached data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: colors.goldDim,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gold,
    letterSpacing: 0.2,
  },
});
