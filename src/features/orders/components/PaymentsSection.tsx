import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { PaymentRow } from '@/features/payments/components/PaymentRow';
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
        <PaymentRow
          key={p.id}
          number={p.number}
          paymentMode={p.payment_mode_name}
          amount={p.amount}
          paymentDate={p.payment_date}
          trailing={p.allocated_to_this_order}
          onPress={() => onOpenPayment(p.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: space[4], gap: space[2] },
  chipsRow: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
});
