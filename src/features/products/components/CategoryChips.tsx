import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { CategoryOut } from '../types';

export type CategoryChipsProps = {
  categories: CategoryOut[];
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  if (!categories.length) return null;
  const active = categories.filter((c) => c.is_active);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="All" selected={selected === null} onPress={() => onSelect(null)} />
      {active.map((c) => (
        <Chip key={c.id} label={c.name} selected={selected === c.id} onPress={() => onSelect(c.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { gap: space[2], paddingVertical: space[2] } });
