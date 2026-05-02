import { Tabs, useRouter } from 'expo-router';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow, radius } from '@/components/ui/tokens';

// ─── Custom glass tab bar ─────────────────────────────────────────────────────

type TabConfig = {
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
};

const TABS: TabConfig[] = [
  { name: 'cellar',    icon: 'wine-outline',    activeIcon: 'wine',       label: 'Cellar'   },
  { name: 'journal',   icon: 'book-outline',    activeIcon: 'book',       label: 'Journal'  },
  { name: 'scan',      icon: 'camera',          activeIcon: 'camera',     label: 'Scan'     },
  { name: 'discover',  icon: 'compass-outline', activeIcon: 'compass',    label: 'Discover' },
  { name: 'more',      icon: 'ellipsis-horizontal-outline', activeIcon: 'ellipsis-horizontal', label: 'More' },
];

function GlassTabBar({ state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.barWrapper, { paddingBottom: insets.bottom }]}>
      <BlurView intensity={40} tint="light" style={[styles.bar, { backgroundColor: colors.tabBar }]}>
        <View style={styles.barInner}>
          {state.routes.map((route, index) => {
            const tab = TABS.find(t => t.name === route.name);
            if (!tab) return null;
            const focused = state.index === index;
            const isScan = route.name === 'scan';

            const onPress = () => {
              if (!focused) {
                router.navigate(`/(tabs)/${route.name}` as never);
              }
            };

            if (isScan) {
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  style={styles.scanWrapper}
                  activeOpacity={0.85}
                >
                  <View style={[styles.scanBtn, shadow.scanBtn]}>
                    <Ionicons name="camera" size={22} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                  <Ionicons
                    name={focused ? tab.activeIcon : tab.icon}
                    size={22}
                    color={focused ? colors.garnet : colors.inkSubtle}
                  />
                </View>
                <Text style={[
                  styles.tabLabel,
                  focused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="cellar" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  barWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.tabBarBorder,
  },
  bar: {
    overflow: 'hidden',
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.tab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: colors.garnetDim,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.inkSubtle,
  },
  tabLabelActive: {
    color: colors.garnet,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: colors.inkSubtle,
  },
  scanWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.garnet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
