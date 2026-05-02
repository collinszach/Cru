import { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { GlassPill } from '@/components/ui/GlassPill';
import { ScoreInput } from './ScoreInput';
import { DescriptorPicker } from './DescriptorPicker';
import type { TastingNote, ScoringSystem, NoseDescriptor } from '@/types';
import { colors, radius } from '@/components/ui/tokens';

interface NoteFormProps {
  initial?: Partial<TastingNote>;
  scoringSystem: ScoringSystem;
  onChange: (data: Partial<TastingNote>) => void;
}

const ACIDITY_OPTS = ['low', 'medium-', 'medium', 'medium+', 'high'] as const;
const TANNIN_OPTS  = ['low', 'medium-', 'medium', 'medium+', 'high'] as const;
const BODY_OPTS    = ['light', 'medium-', 'medium', 'medium+', 'full'] as const;
const FINISH_OPTS  = ['short', 'medium', 'long', 'very_long'] as const;

type AcidityVal = typeof ACIDITY_OPTS[number];
type TanninVal  = typeof TANNIN_OPTS[number];
type BodyVal    = typeof BODY_OPTS[number];
type FinishVal  = typeof FINISH_OPTS[number];

/**
 * Full WSET-structured tasting note form.
 * Controlled — passes all changes up via onChange.
 * Sections: Appearance, Nose, Palate, Score, Free text.
 */
export function NoteForm({ initial = {}, scoringSystem, onChange }: NoteFormProps) {
  const [form, setForm] = useState<Partial<TastingNote>>({
    app_color: initial.app_color,
    nose_descriptors: initial.nose_descriptors ?? [],
    palate_acidity: initial.palate_acidity,
    palate_tannin: initial.palate_tannin,
    palate_body: initial.palate_body,
    palate_finish: initial.palate_finish,
    personal_score: initial.personal_score,
    free_note: initial.free_note,
  });

  // Single update path — always has the latest state, no stale closure.
  const update = (patch: Partial<TastingNote>) => {
    const next = { ...form, ...patch };
    setForm(next);
    onChange({
      ...next,
      app_color: next.app_color || undefined,
      free_note: next.free_note || undefined,
      personal_score: next.personal_score != null ? next.personal_score : undefined,
    });
  };

  return (
    <View>
      {/* Appearance */}
      <SectionHeader>Appearance</SectionHeader>
      <TextInput
        style={styles.input}
        placeholder="Colour (e.g. deep ruby, pale lemon)"
        placeholderTextColor={colors.inkSubtle}
        value={form.app_color ?? ''}
        onChangeText={(v) => update({ app_color: v })}
      />

      {/* Nose */}
      <SectionHeader>Nose</SectionHeader>
      <DescriptorPicker
        selected={form.nose_descriptors ?? []}
        onChange={(d) => update({ nose_descriptors: d })}
      />

      {/* Palate */}
      <SectionHeader>Palate</SectionHeader>

      <OptionRow
        label="Acidity"
        options={ACIDITY_OPTS}
        selected={(form.palate_acidity as AcidityVal) ?? null}
        onSelect={(v) => update({ palate_acidity: v })}
      />
      <OptionRow
        label="Tannin"
        options={TANNIN_OPTS}
        selected={(form.palate_tannin as TanninVal) ?? null}
        onSelect={(v) => update({ palate_tannin: v })}
      />
      <OptionRow
        label="Body"
        options={BODY_OPTS}
        selected={(form.palate_body as BodyVal) ?? null}
        onSelect={(v) => update({ palate_body: v })}
      />
      <OptionRow
        label="Finish"
        options={FINISH_OPTS}
        selected={(form.palate_finish as FinishVal) ?? null}
        onSelect={(v) => update({ palate_finish: v })}
      />

      {/* Score */}
      <SectionHeader>Score</SectionHeader>
      <ScoreInput
        value={form.personal_score ?? null}
        system={scoringSystem}
        onChange={(s) => update({ personal_score: s ?? undefined })}
      />

      {/* Free note */}
      <SectionHeader>Tasting Note</SectionHeader>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        placeholder="Your impressions, in your own words…"
        placeholderTextColor={colors.inkSubtle}
        value={form.free_note ?? ''}
        onChangeText={(v) => update({ free_note: v })}
        multiline
        numberOfLines={5}
      />
    </View>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.sectionHeader}>{children}</Text>
  );
}

function OptionRow<T extends string>({
  label, options, selected, onSelect,
}: {
  label: string;
  options: readonly T[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.optionPills}>
          {options.map(opt => (
            <GlassPill
              key={opt}
              label={opt}
              active={selected === opt}
              onPress={() => onSelect(opt)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.garnetDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
    borderRadius: radius.badge,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  optionRow: { marginBottom: 10 },
  optionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSubtle,
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  optionPills: { flexDirection: 'row', gap: 6 },
});
