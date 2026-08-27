import React from 'react';
import { Text, ListRow } from '@/ui';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';

export type PaymentRowProps = {
  number: string | null;
  paymentMode: string;
  amount: string;
  paymentDate: string;
  /** The figure this row is *about* in its own context — how much of the
   * payment landed on this order, or how much of it is still unallocated. */
  trailing?: string;
  onPress?: () => void;
};

/** One payment as a register/section row. Presentational on purpose: the
 * order detail's payments section and (M3 Task 4) the payments tab's history
 * list carry different envelopes for the same five facts. */
export function PaymentRow({ number, paymentMode, amount, paymentDate, trailing, onPress }: PaymentRowProps) {
  return (
    <ListRow
      title={number ?? 'Draft payment'}
      subtitle={`${paymentMode} · ${formatMoney(amount)} · ${formatDate(paymentDate)}`}
      right={trailing ? <Text variant="bodySm" color="textMuted">{formatMoney(trailing)}</Text> : undefined}
      onPress={onPress}
      chevron={!!onPress}
    />
  );
}
