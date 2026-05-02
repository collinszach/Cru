import { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, StyleSheet,
} from 'react-native';
import { Sheet } from '@/components/ui/Sheet';
import type { LabelScanResult } from '@/types';
import { colors, type as typeScale, radius } from '@/components/ui/tokens';

interface ScanConfirmProps {
  visible: boolean;
  imageUri: string | null;
  result: LabelScanResult | null;
  isScanning: boolean;
  onClose: () => void;
  onAddToCellar: (result: LabelScanResult) => void;
  onLogNote: (result: LabelScanResult) => void;
}

/**
 * Bottom sheet shown after label capture.
 * Left: thumbnail. Right: extracted fields with gold tint on uncertain fields.
 * Editable fields — user corrects extraction before confirming.
 */
export function ScanConfirm({
  visible, imageUri, result, isScanning,
  onClose, onAddToCellar, onLogNote,
}: ScanConfirmProps) {
  const [edited, setEdited] = useState<Partial<LabelScanResult>>({});

  const merged = { ...result, ...edited } as LabelScanResult;
  const isLowConfidence = result?.confidence === 'low';

  return (
    <Sheet visible={visible} onClose={onClose} heightFraction={0.7}>
      {isScanning ? (
        <View style={styles.scanning}>
          <Text style={styles.scanningText}>Reading label…</Text>
        </View>
      ) : result ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Thumbnail + fields side by side */}
          <View style={styles.topRow}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
            )}
            <View style={styles.fields}>
              <EditableField
                label="Producer"
                value={merged.producer ?? ''}
                uncertain={isLowConfidence}
                onChange={(v) => setEdited(e => ({ ...e, producer: v }))}
              />
              <EditableField
                label="Wine"
                value={merged.wine_name ?? ''}
                uncertain={isLowConfidence}
                onChange={(v) => setEdited(e => ({ ...e, wine_name: v }))}
              />
              <EditableField
                label="Vintage"
                value={merged.vintage?.toString() ?? ''}
                uncertain={isLowConfidence}
                keyboardType="number-pad"
                onChange={(v) => setEdited(e => ({ ...e, vintage: parseInt(v, 10) || null }))}
              />
              <EditableField
                label="Appellation"
                value={merged.appellation ?? ''}
                uncertain={false}
                onChange={(v) => setEdited(e => ({ ...e, appellation: v }))}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGarnet]}
              onPress={() => onAddToCellar(merged)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Add to Cellar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGlass]}
              onPress={() => onLogNote(merged)}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: colors.garnet }]}>Log Tasting Note</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

function EditableField({
  label, value, uncertain, onChange, keyboardType = 'default',
}: {
  label: string;
  value: string;
  uncertain: boolean;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, uncertain && styles.fieldUncertainInput]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={colors.inkSubtle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scanning: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  scanningText: { ...typeScale.caption, color: colors.gold },
  topRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  thumbnail: {
    width: 90, height: 120, borderRadius: 10,
    backgroundColor: colors.garnetDim,
  },
  fields: { flex: 1, gap: 8 },
  fieldRow: {},
  fieldLabel: { fontSize: 9, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  fieldInput: {
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.garnetDim,
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
  },
  fieldUncertainInput: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderColor: 'rgba(201,168,76,0.35)',
  },
  actions: { gap: 10 },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  actionBtnGarnet: { backgroundColor: colors.garnet },
  actionBtnGlass: {
    backgroundColor: colors.garnetDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.garnetBorder,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
