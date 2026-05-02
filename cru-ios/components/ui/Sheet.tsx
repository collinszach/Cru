import { useEffect, useState } from 'react';
import {
  StyleSheet, View, TouchableOpacity, Dimensions, type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from './tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Height as fraction of screen. Default 0.6 */
  heightFraction?: number;
  contentStyle?: ViewStyle;
}

const SPRING = { damping: 20, stiffness: 200, mass: 0.8 };

/**
 * Bottom sheet wrapper with iOS spring physics.
 * Dismisses on backdrop tap. No bouncy easing.
 * Stays mounted until dismiss animation completes.
 */
export function Sheet({
  visible,
  onClose,
  children,
  heightFraction = 0.6,
  contentStyle,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const sheetHeight = SCREEN_HEIGHT * heightFraction;
  const translateY = useSharedValue(sheetHeight);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withSpring(0, SPRING);
    } else {
      translateY.value = withSpring(sheetHeight, SPRING, () => {
        runOnJS(setMounted)(false);
      });
    }
  }, [visible, sheetHeight, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop — only interactive when sheet is open */}
      {visible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      )}
      {/* Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
        <BlurView intensity={24} tint="light" style={[styles.sheetInner, { paddingBottom: insets.bottom }]}>
          {/* Drag handle */}
          <View style={styles.handle} />
          <View style={[styles.content, contentStyle]}>{children}</View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,12,8,0.3)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetInner: {
    flex: 1,
    backgroundColor: colors.glassFeatured,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkSubtle,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
