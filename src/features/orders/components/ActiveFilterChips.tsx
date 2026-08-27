import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from '@/ui';
import { space } from '@/ui/tokens/spacing';
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
        <Chip key={c.key} label={c.label} selected onPress={() => onClear(c.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingVertical: space[2] },
});
