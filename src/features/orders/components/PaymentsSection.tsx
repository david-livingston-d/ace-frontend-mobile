import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, ListRow } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import type { OrderPaymentSummary, SalesOrderSummary } from '../types';

export type PaymentsSectionProps = {
  summary: SalesOrderSummary;
  payments: OrderPaymentSummary[];
  onOpenPayment: (id: string) => void;
};

export function PaymentsSection({ summary, payments, onOpenPayment }: PaymentsSectionProps) {
  return (
    <View style={styles.container}>
      <Text variant="h4">Payments</Text>
      <View style={styles.chipsRow}>
        <Chip label={`Value ${formatMoney(summary.order_value)}`} />
        <Chip label={`Paid ${formatMoney(summary.paid_amount)}`} />
        <Chip label={`Outstanding ${formatMoney(summary.receivable)}`} />
      </View>
      {payments.map((p) => (
        <ListRow
          key={p.id}
          title={p.number ?? 'Draft payment'}
          subtitle={`${p.payment_mode_name} · ${formatMoney(p.amount)} · ${formatDate(p.payment_date)}`}
          right={<Text variant="bodySm" color="textMuted">{formatMoney(p.allocated_to_this_order)}</Text>}
          onPress={() => onOpenPayment(p.id)}
          chevron
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: space[4], gap: space[2] },
  chipsRow: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
});
