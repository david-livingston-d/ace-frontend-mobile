import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ListRow, StatusChip } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
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
   * payment landed on this order, or how much of it is still unallocated. */
  trailing?: string;
  onPress?: () => void;
};

/** One payment as a register/section row. Presentational on purpose: the
 * order detail's payments section and the payments tab's History list carry
 * different envelopes for the same handful of facts. */
export function PaymentRow({ number, paymentMode, amount, paymentDate, customerName, status, trailing, onPress }: PaymentRowProps) {
  const subtitle = [customerName, paymentMode, formatMoney(amount), formatDate(paymentDate)].filter(Boolean).join(' · ');
  const right = trailing || status ? (
    <View style={styles.right}>
      {trailing ? <Text variant="bodySm" color="textMuted">{formatMoney(trailing)}</Text> : null}
      {status ? <StatusChip tone={paymentDocStatusTone(status)} label={paymentDocStatusLabel(status)} size="sm" /> : null}
    </View>
  ) : undefined;
  return (
    <ListRow
      title={number ?? 'Draft payment'}
      subtitle={subtitle}
      right={right}
      onPress={onPress}
      chevron={!!onPress}
    />
  );
}

const styles = StyleSheet.create({
  right: { alignItems: 'flex-end', gap: space[1] },
});
