import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Stepper } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { StockHint } from './StockHint';
import type { StockSummary } from '../types';

export type VariantRowProps = {
  sku: string;
  /** Already tax-exclusive (`exclusiveRate(...)`) — this row never re-derives it. */
  price: number | null;
  stock: StockSummary | null;
  qty: number;
  onChange: (qty: number) => void;
};

/** One selected combination inside `VariantPickerSheet`: sku · price, its
 * `StockHint`, and the quantity `Stepper` (min 0 — dropping to 0 is how a
 * combination is removed again, see the sheet's own qty handling). */
export function VariantRow({ sku, price, stock, qty, onChange }: VariantRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text variant="body">{`${sku} · ${price != null ? formatMoney(price) : '—'}`}</Text>
        <StockHint stock={stock} />
      </View>
      <Stepper value={qty} min={0} onChange={onChange} label={sku} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[2], gap: space[3] },
  info: { flex: 1, gap: space[1] },
});
