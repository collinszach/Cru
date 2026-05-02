import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Sheet } from '@/components/ui/Sheet';
import { colors, type as type_, radius } from '@/components/ui/tokens';

interface ConsumptionSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: { occasion?: string; notes?: string }) => void;
  wineName: string;
  isPending?: boolean;
}

export function ConsumptionSheet({
  visible, onClose, onConfirm, wineName, isPending,
}: ConsumptionSheetProps) {
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm({ occasion: occasion || undefined, notes: notes || undefined });
    setOccasion('');
    setNotes('');
  };

  return (
    <Sheet visible={visible} onClose={onClose} heightFraction={0.55}>
      <Text style={styles.heading}>Open a Bottle</Text>
      <Text style={styles.wineName}>{wineName}</Text>

      <Text style={styles.label}>Occasion</Text>
      <TextInput
        style={styles.input}
        placeholder="Dinner, cellar tasting, gift…"
        placeholderTextColor={colors.inkSubtle}
        value={occasion}
        onChangeText={setOccasion}
        returnKeyType="next"
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        placeholder="Quick note before you open it…"
        placeholderTextColor={colors.inkSubtle}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        returnKeyType="done"
      />

      <TouchableOpacity
        style={[styles.btn, isPending && styles.btnDisabled]}
        onPress={handleConfirm}
        disabled={isPending}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>{isPending ? 'Logging…' : 'Log Consumption'}</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...type_.screenTitle,
    fontSize: 20,
    marginTop: 4,
    marginBottom: 2,
  },
  wineName: {
    ...type_.caption,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
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
  inputMulti: {
    height: 72,
    textAlignVertical: 'top',
  },
  btn: {
    marginTop: 20,
    backgroundColor: colors.garnet,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
