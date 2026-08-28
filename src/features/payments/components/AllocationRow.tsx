import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MoneyInput, RowCard, StatusChip } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate, dueTone, todayIso } from '@/lib/format/date';
import type { AllocationRowState } from '../allocation';

export type AllocationRowProps = {
  row: AllocationRowState;
  error?: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  /** Opening the invoice this row settles. Omitted (and the row inert) when
   * the viewer lacks `invoice.read` — the caller decides, so this component
   * stays permission-agnostic. */
  onOpen?: () => void;
};

/**
 * One invoice on the allocation screen (`allocation` frame): which invoice
 * (and whose order), when it is due and what is still owed on it, an overdue
 * badge when it is past its date, and the editable slice of this payment going
 * against it — an `sm` money field inside the card, since the figure belongs
 * to this row rather than to the form.
 */
export function AllocationRow({ row, error, autoFocus, onChange, onOpen }: AllocationRowProps) {
  const number = row.invoice_number ?? 'Draft invoice';
  const overdue = dueTone(row.due_date, todayIso()) === 'danger';

  return (
    <RowCard
      onPress={onOpen}
      title={`${number} · ${row.so_number}`}
      badges={overdue ? <StatusChip tone="danger" label="Overdue" size="sm" /> : undefined}
      meta={`Due ${formatDate(row.due_date)} · ${formatMoney(row.outstanding)} outstanding`}
      footer={
        <View style={styles.field}>
          <MoneyInput
            label="Allocate"
            // The row is *addressed* by its invoice — a screen reader (and a
            // test) hears "INV-… amount", not four identical "Allocate" fields.
            accessibilityLabel={`${number} amount`}
            size="sm"
            value={row.amount}
            onChange={onChange}
            error={error}
            autoFocus={autoFocus}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  field: { marginTop: space[1] },
});
