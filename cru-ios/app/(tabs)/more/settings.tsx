import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassPill } from '@/components/ui/GlassPill';
import type { ScoringSystem } from '@/types';
import { colors, type as type_ } from '@/components/ui/tokens';
import { meApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';

const SCORING_SYSTEMS: Array<{ key: ScoringSystem; label: string }> = [
  { key: '100pt', label: '100pt (Parker)' },
  { key: '20pt',  label: '20pt (Jancis)' },
  { key: '5star', label: '5 Stars' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const getToken = useToken();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => meApi.get(await getToken()),
  });

  const currentSystem: ScoringSystem = (user?.scoring_system as ScoringSystem) ?? '100pt';

  const { mutate: updateScoring, isPending: isSaving } = useMutation({
    mutationFn: async (system: ScoringSystem) =>
      meApi.update(await getToken(), { scoring_system: system }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save scoring preference. Please try again.');
    },
  });

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'Sign out failed. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.garnet} />
          <Text style={styles.backLabel}>More</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Scoring system */}
        <Text style={styles.sectionHeader}>Scoring System</Text>
        <GlassCard style={styles.card}>
          <View style={styles.scoringRow}>
            {SCORING_SYSTEMS.map(({ key, label }) => (
              <GlassPill
                key={key}
                label={label}
                active={currentSystem === key}
                onPress={() => updateScoring(key)}
              />
            ))}
            {isSaving && (
              <ActivityIndicator size="small" color={colors.garnet} style={styles.savingSpinner} />
            )}
          </View>
        </GlassCard>

        {/* Account */}
        <Text style={styles.sectionHeader}>Account</Text>
        <GlassCard style={styles.card}>
          <TouchableOpacity
            style={styles.signOutRow}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.garnet} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={styles.version}>Cru · Phase 1</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontSize: 17, color: colors.garnet },
  content: { padding: 18 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },
  card: { padding: 16 },
  scoringRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  savingSpinner: { marginLeft: 4 },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signOutText: { fontSize: 15, fontWeight: '500', color: colors.garnet },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.inkSubtle,
    marginTop: 32,
  },
});
