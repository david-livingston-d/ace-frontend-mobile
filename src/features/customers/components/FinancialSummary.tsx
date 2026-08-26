import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KpiTile } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney, formatMoneyShort } from '@/lib/format/money';
import type { CustomerFinancialSummary } from '../types';

export type FinancialSummaryProps = { summary: CustomerFinancialSummary };

// PRD §11's four figures, 2x2 — outstanding gets the danger tone only once
// there's actually something owed, same rule `MoneyCards` uses for the
// dashboard's own outstanding tile.
export function FinancialSummary({ summary }: FinancialSummaryProps) {
  const hasOutstanding = Number(summary.outstanding) > 0;
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <View style={styles.cell}>
          <KpiTile
            label="OUTSTANDING"
            value={formatMoneyShort(summary.outstanding)}
            hint={formatMoney(summary.outstanding)}
            tone={hasOutstanding ? 'danger' : undefined}
          />
        </View>
        <View style={styles.cell}>
          <KpiTile label="ADVANCE" value={formatMoneyShort(summary.advance_balance)} hint={formatMoney(summary.advance_balance)} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <KpiTile label="TOTAL PAID" value={formatMoneyShort(summary.total_paid)} hint={formatMoney(summary.total_paid)} />
        </View>
        <View style={styles.cell}>
          <KpiTile label="ORDER VALUE" value={formatMoneyShort(summary.order_value)} hint={formatMoney(summary.order_value)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { marginTop: space[3], gap: space[3] },
  row: { flexDirection: 'row', gap: space[3] },
  cell: { flex: 1 },
});
