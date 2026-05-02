import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notesApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { GlassCard } from '@/components/ui/GlassCard';
import type { TastingNote } from '@/types';
import { colors, type as type_, radius } from '@/components/ui/tokens';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const getToken = useToken();

  const { data: note, isLoading } = useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      const token = await getToken();
      return notesApi.get(token, id);
    },
  });

  if (isLoading || !note) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.loading}>
        <ActivityIndicator color={colors.garnet} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.garnet} />
          <Text style={styles.backLabel}>Journal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.vintageHero}>{note.vintage}</Text>
          <Text style={styles.wineName}>{note.wine?.name ?? '—'}</Text>
          <Text style={styles.producer}>
            {[note.wine?.producer?.name, note.wine?.appellation?.name].filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.date}>
            {new Date(note.tasted_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </View>

        {/* Score */}
        {note.personal_score !== null && note.personal_score !== undefined && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreHero}>{note.personal_score}</Text>
            <Text style={styles.scoreLabel}>pts</Text>
          </View>
        )}

        {/* Appearance */}
        {(note.app_color || note.app_intensity) && (
          <Section title="Appearance">
            <Text style={styles.noteText}>
              {[note.app_intensity, note.app_color, note.app_clarity].filter(Boolean).join(', ')}
            </Text>
          </Section>
        )}

        {/* Nose */}
        {(note.nose_descriptors ?? []).length > 0 && (
          <Section title="Nose">
            <View style={styles.chips}>
              {(note.nose_descriptors ?? []).map(d => (
                <View key={d.descriptor} style={styles.chip}>
                  <Text style={styles.chipText}>{d.descriptor}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Palate */}
        {(note.palate_body || note.palate_acidity || note.palate_tannin) && (
          <Section title="Palate">
            {note.palate_body && <StructuredRow label="Body" value={note.palate_body} />}
            {note.palate_acidity && <StructuredRow label="Acidity" value={note.palate_acidity} />}
            {note.palate_tannin && <StructuredRow label="Tannin" value={note.palate_tannin} />}
            {note.palate_finish && <StructuredRow label="Finish" value={note.palate_finish} />}
          </Section>
        )}

        {/* Free note */}
        {note.free_note && (
          <Section title="Notes">
            <Text style={styles.freeNote}>{note.free_note}</Text>
          </Section>
        )}

        {/* AI enhanced */}
        {note.ai_enhanced_note && (
          <Section title="Enhanced Note">
            <Text style={[styles.freeNote, { fontStyle: 'italic' }]}>{note.ai_enhanced_note}</Text>
          </Section>
        )}

        {/* Amendments */}
        {(note.amendments ?? []).map((a, i) => (
          <Section key={i} title={`Amendment · ${a.created_at.slice(0, 10)}`}>
            <Text style={styles.noteText}>{a.text}</Text>
          </Section>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </GlassCard>
  );
}

function StructuredRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ ...type_.caption, color: colors.inkMuted }}>{label}</Text>
      <Text style={{ ...type_.caption, color: colors.ink, fontWeight: '500', textTransform: 'capitalize' }}>
        {value.replaceAll('_', ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontSize: 17, color: colors.garnet },
  content: { paddingTop: 8 },
  hero: { paddingHorizontal: 18, paddingBottom: 8 },
  vintageHero: { ...type_.vintageHero, fontSize: 56, letterSpacing: -4 },
  wineName: { ...type_.wineNameFeatured, fontSize: 18, marginTop: 4 },
  producer: { ...type_.producer, fontSize: 13, marginTop: 2 },
  date: { ...type_.caption, color: colors.gold, marginTop: 6, fontWeight: '600' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 18,
    marginBottom: 12,
    gap: 4,
  },
  scoreHero: { fontSize: 48, fontWeight: '100', color: colors.garnet, letterSpacing: -3 },
  scoreLabel: { fontSize: 18, color: colors.garnet, fontWeight: '300' },
  section: { marginHorizontal: 14, marginBottom: 10, padding: 16 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  noteText: { ...type_.body, fontSize: 14, lineHeight: 20 },
  freeNote: { ...type_.body, fontSize: 14, lineHeight: 22 },
  chips: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.garnetDim,
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, color: colors.garnet, fontWeight: '500' },
});
