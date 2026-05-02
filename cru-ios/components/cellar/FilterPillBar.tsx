import { ScrollView, StyleSheet } from 'react-native';
import { GlassPill } from '@/components/ui/GlassPill';

export type CellarFilter = 'all' | 'peak' | 'in_window' | 'approaching' | 'not_ready' | string;

interface FilterPillBarProps {
  active: CellarFilter;
  regions: string[];
  onChange: (filter: CellarFilter) => void;
}

const STATIC_FILTERS: Array<{ key: CellarFilter; label: string }> = [
  { key: 'all',        label: 'All'         },
  { key: 'in_window',  label: 'In Window'   },
  { key: 'approaching',label: 'Approaching' },
  { key: 'not_ready',  label: 'On Hold'     },
];

/**
 * Horizontal scrolling filter pills.
 * Static filters first, then dynamic region pills from cellar contents.
 * Things 3-style: garnet-filled active, glass inactive.
 */
export function FilterPillBar({ active, regions, onChange }: FilterPillBarProps) {
  const allFilters = [
    ...STATIC_FILTERS,
    ...regions.map(r => ({ key: r as CellarFilter, label: r })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {allFilters.map(({ key, label }) => (
        <GlassPill
          key={key}
          label={label}
          active={active === key}
          onPress={() => onChange(key)}
          style={styles.pill}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  pill: {},
});
