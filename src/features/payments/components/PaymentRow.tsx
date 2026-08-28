import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RowCard, StatusChip, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import { cmpMoney } from '@/lib/sales/calc';
import { paymentDocStatusLabel, paymentDocStatusTone } from '@/lib/sales/status';

export type PaymentRowProps = {
  number: string | null;
  paymentMode: string;
  amount: string;
  paymentDate: string;
  /** The company-wide History register carries no implied customer (unlike
   * the order detail's own payments section, where it's already the order's
   * customer) — shown first in the subtitle line when given. */
  customerName?: string;
  /** `payments.status` (draft/submitted/cancelled) — omitted where the
   * document's status is already obvious from context (the order detail's
   * payments section only ever lists submitted payments). */
  status?: string;
  /** The figure this row is *about* in its own context — how much of the
   * payment landed on this order, or how much of it is still unallocated.
   * Rides under the amount rather than replacing it. */
  trailing?: string;
  onPress?: () => void;
};

/**
 * One payment, as every list in the app draws it (`payments-history` frame):
 * the number (or "Draft payment") as the title, `customer · mode · date` as
 * the meta, and the amount right-aligned in the trailing slot with its status
 * badge underneath.
 *
 * **One layout, deliberately.** This used to fold the amount into the meta
 * line, which on a phone made "Arjun Mehta · Bank Transfer · ₹20,000.00 · 27
 * Aug 2026" wrap — so the same component read as two different rows depending
 * on how long the customer's name was. The amount is a figure, not part of a
 * sentence: it belongs in the column that every other list right-aligns its
 * money in.
 */
export function PaymentRow({ number, paymentMode, amount, paymentDate, customerName, status, trailing, onPress }: PaymentRowProps) {
  const meta = [customerName, paymentMode, formatDate(paymentDate)].filter(Boolean).join(' · ');
  // A contextual figure identical to the amount says nothing the amount has
  // not already said (a wholly unallocated payment) — only a *different*
  // figure is worth a second line.
  const extra = trailing && cmpMoney(trailing, amount) !== 0 ? trailing : undefined;

  return (
    <RowCard
      title={number ?? 'Draft payment'}
      meta={meta}
      trailing={
        <View style={styles.trailing}>
          <Text variant="rowStrong">{formatMoney(amount)}</Text>
          {extra ? <Text variant="caption" color="muted">{formatMoney(extra)}</Text> : null}
          {status ? (
            <StatusChip tone={paymentDocStatusTone(status)} label={paymentDocStatusLabel(status)} size="sm" />
          ) : null}
        </View>
      }
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  trailing: { alignItems: 'flex-end', gap: space[1] + 1 },
});
