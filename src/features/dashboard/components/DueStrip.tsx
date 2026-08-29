import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text } from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import type { OrderPreset } from '@/features/orders/filters';
import type { DashboardSalesOut } from '../types';

export type DueStripProps = {
  due: DashboardSalesOut['due'];
  onNavigate: (preset: OrderPreset) => void;
};

/**
 * Canvas edit #3: three flex-1 count chips in one row — a bold count and a
 * label, the overdue one glowing faintly red, due-today amber, this-week
 * neutral — with a caption saying they are taps, not decoration.
 *
 * Deliberately **not** a horizontal `ScrollView`: a scroll view clips its
 * children's `boxShadow`, which is the whole depth of a toned chip. Three
 * chips always fit a phone row, so they share it with `flex`.
 */
export function DueStrip({ due, onNavigate }: DueStripProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Chip flex count={due.overdue} label="Overdue" tone="danger" onPress={() => onNavigate('overdue')} />
        {/* Due-today / due-this-week have no date-range register filter of their own yet
            (arrives with M2's filter sheet) — both route to the general open list for now. */}
        <Chip flex count={due.due_today} label="Due today" tone="warning" onPress={() => onNavigate('open')} />
        <Chip flex count={due.due_this_week} label="This week" tone="neutral" onPress={() => onNavigate('open')} />
      </View>
      <Text variant="caption" color="muted" align="center">Tap a tag to filter the order list</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // The vertical padding is the chips' drop shadow's room to land in — without
  // it the row's own bounds cut the glow off at the chip's edge.
  wrap: { gap: space[2], paddingVertical: space[2] },
  row: { flexDirection: 'row', gap: gapChips },
});
