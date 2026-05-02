import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { statsApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors, type as type_, radius } from '@/components/ui/tokens';

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const token = await getToken();
      return statsApi.dashboard(token);
    },
  });

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats summary */}
        <GlassCard featured style={styles.statsCard}>
          <Text style={styles.sectionLabel}>At a Glance</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.garnet} style={{ marginTop: 12 }} />
          ) : (
            <View style={styles.statsGrid}>
              <StatBox label="Bottles" value={stats?.total_bottles?.toString() ?? '—'} />
              <StatBox label="Notes" value={stats?.total_notes?.toString() ?? '—'} />
              <StatBox label="Regions" value={stats?.regions_count?.toString() ?? '—'} />
              <StatBox label="In Window" value={stats?.bottles_in_window?.toString() ?? '—'} />
            </View>
          )}
        </GlassCard>

        {/* Nav rows */}
        <GlassCard style={styles.listCard}>
          <NavRow
            icon="bookmark"
            label="Wishlist"
            onPress={() => router.push('/(tabs)/more/wishlist')}
          />
          <Divider />
          <NavRow
            icon="restaurant"
            label="Pairings"
            onPress={() => router.push('/(tabs)/more/pairings')}
          />
          <Divider />
          <NavRow
            icon="stats-chart"
            label="Stats"
            onPress={() => router.push('/(tabs)/more/stats')}
          />
        </GlassCard>

        <GlassCard style={styles.listCard}>
          <NavRow
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/(tabs)/more/settings')}
          />
        </GlassCard>
      </ScrollView>
    </LinearGradient>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function NavRow({
  icon, label, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={navStyles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={colors.garnet} style={navStyles.icon} />
      <Text style={navStyles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.inkSubtle} />
    </TouchableOpacity>
  );
}

function Divider() {
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.garnetBorder, marginLeft: 46 }} />
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center' },
  value: { fontSize: 24, fontWeight: '200', color: colors.garnet, letterSpacing: -1 },
  label: { fontSize: 10, fontWeight: '500', color: colors.inkMuted, marginTop: 2 },
});

const navStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  icon: { marginRight: 14 },
  label: { flex: 1, fontSize: 15, fontWeight: '400', color: colors.ink },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  title: { ...type_.screenTitle },
  content: { padding: 14, gap: 12 },
  statsCard: { padding: 16 },
  listCard: { padding: 16 },
  statsGrid: { flexDirection: 'row', marginTop: 12 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
