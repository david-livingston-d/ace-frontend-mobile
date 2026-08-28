import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, HeaderRow, StatusChip, Text } from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { PaymentRow } from '@/features/payments/components/PaymentRow';
import type { OrderPaymentSummary, SalesOrderSummary } from '../types';

export type PaymentsSectionProps = {
  summary: SalesOrderSummary;
  payments: OrderPaymentSummary[];
  onOpenPayment: (id: string) => void;
};

/**
 * The money card. Canvas edit #7: the three figures are wrapping badges rather
 * than a fixed row — "Outstanding" is abbreviated to "Outst." *inside the chip
 * row* so the third badge still fits a phone width beside its amount.
 */
export function PaymentsSection({ summary, payments, onOpenPayment }: PaymentsSectionProps) {
  const outstanding = Number(summary.receivable) > 0;

  return (
    <Card>
      <HeaderRow>
        <Text variant="label" color="muted">Payments</Text>
        {payments.length > 0 ? (
          <Text variant="caption" color="muted">
            {payments.length} {payments.length === 1 ? 'receipt' : 'receipts'}
          </Text>
        ) : null}
      </HeaderRow>

      <View style={styles.chipsRow}>
        <StatusChip tone="neutral" size="sm" label={`Value ${formatMoney(summary.order_value)}`} />
        <StatusChip tone="success" size="sm" label={`Paid ${formatMoney(summary.paid_amount)}`} />
        <StatusChip
          tone={outstanding ? 'danger' : 'neutral'}
          size="sm"
          label={`Outst. ${formatMoney(summary.receivable)}`}
        />
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
    </Card>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips - 2, marginTop: space[3] },
});
