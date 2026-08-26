import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { DashboardSalesOut } from '../types';

export type TeamChipsProps = {
  users: DashboardSalesOut['sales_users'];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

// Only mounted by HomeScreen when `sales_users.length > 0` (an executive's
// "own" scope never gets this list, so the chip row never shows for them).
export function TeamChips({ users, selectedId, onSelect }: TeamChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="All teams" selected={selectedId === null} onPress={() => onSelect(null)} />
      {users.map((user) => (
        <Chip key={user.id} label={user.name} selected={selectedId === user.id} onPress={() => onSelect(user.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { gap: space[2], paddingVertical: space[2] } });
