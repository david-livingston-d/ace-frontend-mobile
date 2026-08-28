import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import type { CategoryOut } from '../types';

export type CategoryChipsProps = {
  categories: CategoryOut[];
  selected: string | null;
  onSelect: (id: string | null) => void;
};

/**
 * The category filter above the product grid (`wizard-2-products`): a
 * **wrapping** row of small chips, not a horizontal scroller.
 *
 * This was a horizontal `ScrollView`, and RN gives one `flexGrow: 1`
 * (`ScrollView`'s own `baseHorizontal` style) — so inside the screen's flex
 * column it split the free height with the grid's `FlatList` and left ~150 px
 * of nothing between the chips and the first row of products. A wrapping row
 * both matches the frame and takes only the height it needs.
 */
export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  if (!categories.length) return null;
  const active = categories.filter((c) => c.is_active);
  return (
    <View style={styles.row}>
      <Chip label="All" size="sm" selected={selected === null} onPress={() => onSelect(null)} />
      {active.map((c) => (
        <Chip key={c.id} label={c.name} size="sm" selected={selected === c.id} onPress={() => onSelect(c.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: gapChips - 1, paddingVertical: space[2] },
});
