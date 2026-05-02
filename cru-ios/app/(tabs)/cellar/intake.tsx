import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cellarApi, winesApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassPill } from '@/components/ui/GlassPill';
import type { WineAutocompleteResult, AddToCellarRequest, WineFormat } from '@/types';
import { colors, type as type_, radius, spacing } from '@/components/ui/tokens';

const FORMATS: WineFormat[] = ['375ml', '750ml', '1.5L', '3L'];

export default function IntakeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ wine_id?: string; wine_name?: string }>();

  // If wine_id was passed (e.g. from wine detail screen), pre-select it and skip to step 2
  const preselectedWine: WineAutocompleteResult | null = params.wine_id && params.wine_name
    ? { id: params.wine_id, full_name: decodeURIComponent(params.wine_name) }
    : null;

  // Step 1: wine selection
  const [step, setStep] = useState<1 | 2>(preselectedWine ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWine, setSelectedWine] = useState<WineAutocompleteResult | null>(preselectedWine);

  // Step 2: purchase details
  const [vintage, setVintage] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [format, setFormat] = useState<WineFormat>('750ml');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [binLocation, setBinLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Autocomplete query
  const { data: suggestions = [] } = useQuery({
    queryKey: ['wines', 'autocomplete', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const token = await getToken();
      return winesApi.autocomplete(token, searchQuery);
    },
    enabled: searchQuery.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: async (req: AddToCellarRequest) => {
      const token = await getToken();
      return cellarApi.add(token, req);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cellar'] });
      router.back();
    },
  });

  const handleSelectWine = (wine: WineAutocompleteResult) => {
    setSelectedWine(wine);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!selectedWine) return;
    const vintageYear = parseInt(vintage, 10);
    if (isNaN(vintageYear) || vintageYear < 1900 || vintageYear > new Date().getFullYear() + 2) return;

    addMutation.mutate({
      wine_id: selectedWine.id,
      vintage: vintageYear,
      quantity: parseInt(quantity, 10) || 1,
      format,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchase_date: purchaseDate || undefined,
      bin_location: binLocation || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {step === 2 ? (
            <TouchableOpacity onPress={() => setStep(1)} style={styles.closeBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.garnet} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.garnet} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Add to Cellar</Text>
          <Text style={styles.stepLabel}>Step {step} of 2</Text>
        </View>

        {step === 1 ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search input */}
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={colors.inkMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search wine, producer, or appellation…"
                placeholderTextColor={colors.inkSubtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
            </View>

            {/* Autocomplete results */}
            {suggestions.map(wine => (
              <TouchableOpacity
                key={wine.id}
                onPress={() => handleSelectWine(wine)}
                activeOpacity={0.8}
              >
                <GlassCard style={styles.suggestionCard}>
                  <Text style={styles.suggestionName}>{wine.full_name}</Text>
                  <Text style={styles.suggestionMeta}>
                    {[wine.producer_name, wine.appellation_name].filter(Boolean).join(' · ')}
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            ))}

            {searchQuery.length >= 2 && suggestions.length === 0 && (
              <Text style={styles.empty}>No results — try a producer name or appellation.</Text>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Selected wine */}
            <GlassCard featured style={styles.selectedWineCard}>
              <Text style={styles.selectedWineName}>{selectedWine?.full_name}</Text>
              <Text style={styles.selectedWineMeta}>{selectedWine?.appellation_name}</Text>
            </GlassCard>

            <FieldLabel>Vintage *</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="2019"
              placeholderTextColor={colors.inkSubtle}
              value={vintage}
              onChangeText={setVintage}
              keyboardType="number-pad"
              maxLength={4}
            />

            <FieldLabel>Quantity</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={colors.inkSubtle}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />

            <FieldLabel>Format</FieldLabel>
            <View style={styles.formatRow}>
              {FORMATS.map(f => (
                <GlassPill
                  key={f}
                  label={f}
                  active={format === f}
                  onPress={() => setFormat(f)}
                />
              ))}
            </View>

            <FieldLabel>Purchase Price</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.inkSubtle}
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              keyboardType="decimal-pad"
            />

            <FieldLabel>Purchase Date</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inkSubtle}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
            />

            <FieldLabel>Bin Location</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="A-3"
              placeholderTextColor={colors.inkSubtle}
              value={binLocation}
              onChangeText={setBinLocation}
            />

            <FieldLabel>Notes</FieldLabel>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Provenance, allocation notes…"
              placeholderTextColor={colors.inkSubtle}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitBtn, addMutation.isPending && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={addMutation.isPending || !vintage}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>
                {addMutation.isPending ? 'Adding…' : 'Add to Cellar'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '600', color: colors.inkMuted,
      letterSpacing: 0.5, textTransform: 'uppercase',
      marginBottom: 6, marginTop: 16,
    }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: { marginRight: 12 },
  title: { ...type_.screenTitle, fontSize: 20, flex: 1 },
  stepLabel: { ...type_.caption, color: colors.gold },
  scroll: { flex: 1 },
  scrollContent: { padding: 18 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 12,
  },
  suggestionCard: { padding: 14, marginBottom: 8 },
  suggestionName: { ...type_.wineName, fontSize: 14 },
  suggestionMeta: { ...type_.producer, marginTop: 2 },
  empty: { ...type_.caption, textAlign: 'center', marginTop: 32 },
  selectedWineCard: { padding: 16, marginBottom: 4 },
  selectedWineName: { ...type_.wineNameFeatured, fontSize: 16 },
  selectedWineMeta: { ...type_.producer, marginTop: 3 },
  input: {
    backgroundColor: colors.garnetDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
    borderRadius: radius.badge,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  formatRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  submitBtn: {
    marginTop: 24,
    backgroundColor: colors.garnet,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
