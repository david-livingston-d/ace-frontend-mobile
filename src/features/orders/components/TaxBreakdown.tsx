import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import type { SalesOrderDetail } from '../types';

export type TaxBreakdownProps = { order: SalesOrderDetail };

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'h4' : 'bodySm'} color={strong ? 'text' : 'textMuted'}>{label}</Text>
      <Text variant={strong ? 'money' : 'bodySm'}>{formatMoney(value)}</Text>
    </View>
  );
}

/** Every distinct `tax_rate` on the order's lines, its combined `tax_amount` —
 * an order can mix rates line to line (different HSNs), so the one top-level
 * `tax` figure alone doesn't say which rates made it up. */
function taxByRate(order: SalesOrderDetail): { rate: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const line of order.lines) {
    const prior = totals.get(line.tax_rate) ?? 0;
    totals.set(line.tax_rate, prior + Number(line.tax_amount));
  }
  return [...totals.entries()].map(([rate, amount]) => ({ rate, amount }));
}

export function TaxBreakdown({ order }: TaxBreakdownProps) {
  const rates = taxByRate(order);
  return (
    <View>
      <Row label="Gross" value={order.gross} />
      <Row label="Line discount" value={order.line_discount} />
      <Row label="Order discount" value={order.order_discount} />
      <Row label="Taxable" value={order.taxable} />
      {rates.map((r) => (
        <Row key={r.rate} label={`Tax @ ${r.rate}%`} value={String(r.amount)} />
      ))}
      <Divider style={styles.divider} />
      <Row label="Net" value={order.net} strong />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[1] },
  divider: { marginVertical: space[2] },
});
