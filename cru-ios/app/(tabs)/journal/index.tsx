import { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notesApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { GlassCard } from '@/components/ui/GlassCard';
import { NetworkBanner } from '@/components/ui/NetworkBanner';
import type { TastingNote } from '@/types';
import { colors, type as type_, radius } from '@/components/ui/tokens';

// Group notes by tasted_at date (YYYY-MM-DD)
function groupByDate(notes: TastingNote[]): Array<{ date: string; notes: TastingNote[] }> {
  const map = new Map<string, TastingNote[]>();
  for (const note of notes) {
    const key = note.tasted_at.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, notes]) => ({ date, notes }));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const token = await getToken();
      return notesApi.list(token, { per_page: 100 });
    },
  });

  const groups = useMemo(
    () => groupByDate(data?.items ?? []),
    [data],
  );

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.loading}>
        <ActivityIndicator color={colors.garnet} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      <NetworkBanner />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.meta}>{data?.total ?? 0} tasting notes</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.garnet} />
        }
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 && (
          <Text style={styles.empty}>No tasting notes yet. Tap the scanner or use + to log your first bottle.</Text>
        )}

        {groups.map(({ date, notes }) => (
          <View key={date}>
            {/* Letterboxd-style date header */}
            <Text style={styles.dateHeader}>{formatDate(date)}</Text>

            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onPress={() => router.push(`/(tabs)/journal/${note.id}`)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => router.push('/(tabs)/journal/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

function NoteCard({ note, onPress }: { note: TastingNote; onPress: () => void }) {
  const topDescriptors = (note.nose_descriptors ?? []).slice(0, 2);
  const score = note.personal_score;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.noteCard}>
        <View style={styles.noteInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.noteWineName} numberOfLines={1}>
              {note.wine?.name ?? '—'}
            </Text>
            <Text style={styles.noteProducer} numberOfLines={1}>
              {note.wine?.producer?.name}
              {note.vintage ? ` · ${note.vintage}` : ''}
            </Text>
            {topDescriptors.length > 0 && (
              <View style={styles.chips}>
                {topDescriptors.map(d => (
                  <View key={d.descriptor} style={styles.chip}>
                    <Text style={styles.chipText}>{d.descriptor}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {score !== null && score !== undefined && (
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  title: { ...type_.screenTitle },
  meta: { ...type_.screenMeta, marginTop: 3 },
  content: { paddingTop: 20, paddingHorizontal: 14 },
  dateHeader: {
    ...type_.dateHeader,
    marginBottom: 10,
    marginLeft: 4,
  },
  noteCard: { marginBottom: 9, padding: 14 },
  noteInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  noteWineName: { ...type_.wineName, fontSize: 14 },
  noteProducer: { ...type_.producer, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 5, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.garnetDim,
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 10, color: colors.garnet, fontWeight: '500' },
  scorePill: {
    backgroundColor: colors.garnet,
    borderRadius: radius.stat,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  scoreText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  empty: {
    ...type_.caption,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.garnet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.garnetShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
});
