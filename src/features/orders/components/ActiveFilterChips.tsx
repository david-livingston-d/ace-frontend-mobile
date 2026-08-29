import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import type { FilterChip } from '@/store/filters';

export type ActiveFilterChipsProps = {
  chips: FilterChip[];
  onClear: (key: string) => void;
};

/** One dismissible `Chip` per active filter — tapping a chip clears just that
 * filter (there's no separate close glyph in the shared `Chip`, so the whole
 * chip is the tap target). */
export function ActiveFilterChips({ chips, onClear }: ActiveFilterChipsProps) {
  if (!chips.length) return null;
  return (
    <View style={styles.row}>
      {chips.map((c) => (
        <Chip key={c.key} label={c.label} size="sm" selected onPress={() => onClear(c.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // The vertical padding is the chips' drop shadow's landing room — a wrapped
  // row with none of it clips the lift off every chip's bottom edge.
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips - 1, paddingVertical: space[2] },
});
