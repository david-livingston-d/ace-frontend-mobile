import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, MoneyInput } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import type { AllocationRowState } from '../allocation';

export type AllocationRowProps = {
  row: AllocationRowState;
  error?: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
};

/** One invoice on the allocation screen: which invoice (and whose order),
 * when it is due and what is still owed on it, and the editable slice of this
 * payment going against it. */
export function AllocationRow({ row, error, autoFocus, onChange }: AllocationRowProps) {
  const label = `${row.invoice_number ?? 'Draft invoice'} · ${row.so_number}`;
  return (
    <View style={styles.row}>
      <Text variant="body">{label}</Text>
      <Text variant="bodySm" color="textMuted">
        {`Due ${formatDate(row.due_date)} · ${formatMoney(row.outstanding)} outstanding`}
      </Text>
      <MoneyInput
        label={`${row.invoice_number ?? 'Draft invoice'} amount`}
        value={row.amount}
        onChange={onChange}
        error={error}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[1], paddingVertical: space[3] },
});
