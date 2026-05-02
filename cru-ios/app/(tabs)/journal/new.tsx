import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notesApi, winesApi, meApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { NoteForm } from '@/components/tasting/NoteForm';
import { GlassCard } from '@/components/ui/GlassCard';
import { noteDraftStorage } from '@/lib/queryClient';
import type { TastingNote, WineAutocompleteResult, ScoringSystem } from '@/types';
import { colors, type as type_, radius } from '@/components/ui/tokens';

export default function NewNoteScreen() {
  const params = useLocalSearchParams<{ cellar_entry_id?: string; wine_id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();
  const qc = useQueryClient();

  const [formData, setFormData] = useState<Partial<TastingNote>>({});
  const [vintage, setVintage] = useState('');
  const [wineSearch, setWineSearch] = useState('');
  const [selectedWine, setSelectedWine] = useState<WineAutocompleteResult | null>(null);
  const draftRestored = useRef(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => meApi.get(await getToken()),
  });
  const scoringSystem: ScoringSystem = (me?.scoring_system as ScoringSystem) ?? '100pt';

  // Restore draft on first open
  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    const draft = noteDraftStorage.load();
    if (draft) {
      Alert.alert(
        'Restore draft?',
        'You have an unfinished tasting note.',
        [
          { text: 'Discard', style: 'destructive', onPress: () => noteDraftStorage.clear() },
          { text: 'Restore', onPress: () => setFormData(draft) },
        ],
      );
    }
  }, []);

  // Keep a ref in sync so the interval closure never goes stale
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // Stable 30s interval — never resets, reads latest via ref
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(formDataRef.current).length > 0) {
        noteDraftStorage.save(formDataRef.current);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Autocomplete
  const { data: suggestions = [] } = useQuery({
    queryKey: ['wines', 'autocomplete', wineSearch],
    queryFn: async () => {
      if (wineSearch.length < 2) return [];
      const token = await getToken();
      return winesApi.autocomplete(token, wineSearch);
    },
    enabled: wineSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<TastingNote>) => {
      const token = await getToken();
      return notesApi.create(token, data as import('@/types').CreateTastingNoteRequest);
    },
    onSuccess: () => {
      noteDraftStorage.clear();
      qc.invalidateQueries({ queryKey: ['notes'] });
      router.back();
    },
    onError: () => {
      Alert.alert(
        'Save failed',
        "You're offline — your note has been saved as a draft.",
      );
    },
  });

  const handleSubmit = () => {
    if (!selectedWine || !vintage) {
      Alert.alert('Missing info', 'Please select a wine and enter a vintage year.');
      return;
    }
    const vintageYear = parseInt(vintage, 10);
    if (isNaN(vintageYear)) {
      Alert.alert('Invalid vintage', 'Please enter a valid vintage year.');
      return;
    }

    createMutation.mutate({
      ...formData,
      wine_id: selectedWine.id,
      vintage: vintageYear,
      tasted_at: new Date().toISOString(),
      cellar_entry_id: params.cellar_entry_id ?? null,
    });
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.garnet} />
          </TouchableOpacity>
          <Text style={styles.title}>Tasting Note</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            style={styles.saveBtn}
          >
            <Text style={[styles.saveBtnText, createMutation.isPending && styles.saveBtnDisabled]}>
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Wine selector */}
          <GlassCard style={styles.wineSelector}>
            {selectedWine ? (
              <TouchableOpacity onPress={() => setSelectedWine(null)}>
                <Text style={styles.selectedWineName}>{selectedWine.full_name}</Text>
                <Text style={styles.changeWine}>Tap to change</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.wineSearchInput}
                  placeholder="Search wine…"
                  placeholderTextColor={colors.inkSubtle}
                  value={wineSearch}
                  onChangeText={setWineSearch}
                />
                {suggestions.map(w => (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => { setSelectedWine(w); setWineSearch(''); }}
                    style={styles.suggestion}
                  >
                    <Text style={styles.suggestionText}>{w.full_name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </GlassCard>

          {/* Vintage */}
          <TextInput
            style={styles.vintageInput}
            placeholder="Vintage year"
            placeholderTextColor={colors.inkSubtle}
            value={vintage}
            onChangeText={setVintage}
            keyboardType="number-pad"
            maxLength={4}
          />

          {/* Note form */}
          <NoteForm
            initial={formData}
            scoringSystem={scoringSystem}
            onChange={setFormData}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
  },
  closeBtn: { marginRight: 12 },
  title: { ...type_.screenTitle, fontSize: 20, flex: 1 },
  saveBtn: {},
  saveBtnText: { fontSize: 16, fontWeight: '600', color: colors.garnet },
  saveBtnDisabled: { color: colors.inkSubtle },
  content: { padding: 18 },
  wineSelector: { padding: 14, marginBottom: 12 },
  selectedWineName: { ...type_.wineName, fontSize: 15 },
  changeWine: { ...type_.caption, color: colors.gold, marginTop: 4 },
  wineSearchInput: { fontSize: 15, color: colors.ink, paddingVertical: 4 },
  suggestion: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.garnetBorder,
  },
  suggestionText: { fontSize: 14, color: colors.ink },
  vintageInput: {
    backgroundColor: colors.garnetDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
    borderRadius: radius.badge,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 4,
  },
});
