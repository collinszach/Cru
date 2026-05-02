import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NoseDescriptor } from '@/types';
import { colors, radius } from '@/components/ui/tokens';

// Abbreviated WSET vocabulary. Full list in data/descriptors.ts for production.
const VOCABULARY: Record<string, string[]> = {
  'Primary — Fruit': [
    'red cherry', 'black cherry', 'plum', 'blackcurrant', 'blueberry',
    'strawberry', 'raspberry', 'fig', 'lemon', 'grapefruit', 'lime', 'pineapple',
    'mango', 'peach', 'apricot', 'apple', 'pear',
  ],
  'Primary — Other': [
    'floral', 'violet', 'rose', 'elderflower', 'green pepper', 'black pepper',
    'eucalyptus', 'mint', 'grass', 'mineral', 'wet stone', 'cream',
  ],
  'Secondary': [
    'bread', 'brioche', 'biscuit', 'yeast', 'butter', 'cheese',
    'yoghurt', 'sour cream',
  ],
  'Tertiary': [
    'tobacco', 'leather', 'cedar', 'cigar box', 'earth', 'mushroom',
    'truffle', 'forest floor', 'game', 'vanilla', 'caramel', 'toffee',
    'nutmeg', 'cinnamon', 'clove', 'coffee', 'chocolate', 'mocha',
    'smoke', 'tar', 'petrol', 'honey', 'dried fruit', 'nuts',
    'sous bois',
  ],
};

interface DescriptorPickerProps {
  selected: NoseDescriptor[];
  onChange: (descriptors: NoseDescriptor[]) => void;
}

/**
 * Accordion-by-tier descriptor picker.
 * Search filter at top (Bear-style). Tap to add/remove.
 * Selected descriptors shown as garnet chips above the accordion.
 */
export function DescriptorPicker({ selected, onChange }: DescriptorPickerProps) {
  const [search, setSearch] = useState('');
  const [openTiers, setOpenTiers] = useState<Set<string>>(new Set(['Primary — Fruit']));

  const isSelected = (d: string) => selected.some(s => s.descriptor === d);

  const toggle = (descriptor: string, tier: string) => {
    if (isSelected(descriptor)) {
      onChange(selected.filter(s => s.descriptor !== descriptor));
    } else {
      const tierKey = tier.toLowerCase().startsWith('primary') ? 'primary'
        : tier.toLowerCase().startsWith('secondary') ? 'secondary' : 'tertiary';
      onChange([
        ...selected,
        { tier: tierKey as NoseDescriptor['tier'], descriptor, intensity: 'medium' },
      ]);
    }
  };

  const toggleTier = (tier: string) => {
    const next = new Set(openTiers);
    if (next.has(tier)) next.delete(tier); else next.add(tier);
    setOpenTiers(next);
  };

  const filteredVocab = search.length < 2
    ? VOCABULARY
    : Object.fromEntries(
        Object.entries(VOCABULARY)
          .map(([tier, items]): [string, string[]] => [
            tier,
            items.filter(d => d.toLowerCase().includes(search.toLowerCase())),
          ])
          .filter(([, items]) => items.length > 0),
      );

  return (
    <View>
      {/* Selected chips */}
      {selected.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chipsRow}>
            {selected.map(s => (
              <TouchableOpacity
                key={s.descriptor}
                style={styles.selectedChip}
                onPress={() => onChange(selected.filter(x => x.descriptor !== s.descriptor))}
                activeOpacity={0.7}
              >
                <Text style={styles.selectedChipText}>{s.descriptor}</Text>
                <Ionicons name="close" size={10} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={14} color={colors.inkMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search descriptors…"
          placeholderTextColor={colors.inkSubtle}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Accordion */}
      {Object.entries(filteredVocab).map(([tier, items]) => (
        <View key={tier}>
          <TouchableOpacity onPress={() => toggleTier(tier)} style={styles.tierHeader} activeOpacity={0.7}>
            <Text style={styles.tierLabel}>{tier}</Text>
            <Ionicons
              name={openTiers.has(tier) ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.inkMuted}
            />
          </TouchableOpacity>

          {openTiers.has(tier) && (
            <View style={styles.descriptorGrid}>
              {items.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, isSelected(d) && styles.chipActive]}
                  onPress={() => toggle(d, tier)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected(d) && styles.chipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsScroll: { marginBottom: 10 },
  chipsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 2 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.garnet,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedChipText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.garnetDim,
    borderRadius: radius.badge,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.garnetBorder,
    marginBottom: 8,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  descriptorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.badge,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: colors.garnetDim,
    borderColor: colors.garnetBorder,
  },
  chipText: { fontSize: 12, color: colors.inkMuted },
  chipTextActive: { color: colors.garnet, fontWeight: '600' },
});
