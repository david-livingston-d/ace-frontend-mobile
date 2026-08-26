import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { OrderPreset } from '@/features/orders/filters';
import type { DashboardSalesOut } from '../types';

export type DueStripProps = {
  due: DashboardSalesOut['due'];
  onNavigate: (preset: OrderPreset) => void;
};

export function DueStrip({ due, onNavigate }: DueStripProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label={`Overdue ${due.overdue}`} tone="danger" onPress={() => onNavigate('overdue')} />
      {/* Due-today / due-this-week have no date-range register filter of their own yet
          (arrives with M2's filter sheet) — both route to the general open list for now. */}
      <Chip label={`Due today ${due.due_today}`} tone="warning" onPress={() => onNavigate('open')} />
      <Chip label={`Due this week ${due.due_this_week}`} tone="neutral" onPress={() => onNavigate('open')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { gap: space[2], paddingVertical: space[2] } });
