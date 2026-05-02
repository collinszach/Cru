import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors, radius } from '@/components/ui/tokens';
import { pairingsApi } from '@/lib/api';
import { useToken } from '@/hooks/useToken';
import type { PairingResult } from '@/types';

export default function PairingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getToken = useToken();

  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<PairingResult | null>(null);

  const { mutate: findPairings, isPending } = useMutation({
    mutationFn: async (food: string) => {
      const token = await getToken();
      return pairingsApi.fromFood(token, { food });
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleFind = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setResult(null);
    findPairings(trimmed);
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.root}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.garnet} />
          <Text style={styles.backLabel}>More</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Pairings</Text>
        {/* spacer to balance the back button */}
        <View style={styles.navRight} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Input area */}
        <GlassCard style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your dish or ingredient…"
            placeholderTextColor={colors.inkMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
          />
        </GlassCard>

        {/* Find button */}
        <TouchableOpacity
          style={[styles.findBtn, isPending && styles.findBtnDisabled]}
          onPress={handleFind}
          disabled={isPending || inputText.trim().length === 0}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="wine-outline" size={18} color="#fff" />
              <Text style={styles.findBtnText}>Find Pairings</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        {result !== null ? (
          <View style={styles.results}>
            <Text style={styles.sectionHeader}>Suggestions</Text>

            {result.suggestions.map((suggestion, index) => (
              <GlassCard key={index} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.wineName} numberOfLines={2}>
                    {suggestion.name}
                  </Text>
                  {suggestion.cellar_entry !== undefined && (
                    <View style={styles.cellarBadge}>
                      <Text style={styles.cellarBadgeText}>In Your Cellar</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.reasonText}>{suggestion.reason}</Text>
              </GlassCard>
            ))}

            {result.notes.length > 0 && (
              <Text style={styles.notesText}>{result.notes}</Text>
            )}
          </View>
        ) : (
          !isPending && (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={36} color={colors.inkSubtle} />
              <Text style={styles.emptyText}>
                Enter a dish to find the perfect wine from our database and your cellar.
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  navBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.tabBarHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarHeaderBorder,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backLabel: { fontSize: 17, color: colors.garnet },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  navRight: { minWidth: 70 },

  content: { padding: 18, gap: 14 },

  inputCard: { padding: 14 },
  textInput: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    minHeight: 72,
  },

  findBtn: {
    backgroundColor: colors.garnet,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  findBtnDisabled: { opacity: 0.55 },
  findBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  results: { gap: 12 },

  suggestionCard: { padding: 16, gap: 8 },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  wineName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cellarBadge: {
    backgroundColor: colors.garnet,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
  },
  cellarBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  reasonText: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 19,
  },

  notesText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.inkSubtle,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 14,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
});
