import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, Expander } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import type { CalcTotals } from '@/lib/sales/calc';
import type { DraftLine } from '../store/draft';

export type TotalsCardProps = {
  totals: CalcTotals;
  /** In `draftLines` order, so `totals.lines[i]` belongs to `lines[i]`. */
  lines: DraftLine[];
};

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'h4' : 'bodySm'} color={strong ? 'text' : 'textMuted'}>{label}</Text>
      <Text variant={strong ? 'money' : 'bodySm'}>{formatMoney(value)}</Text>
    </View>
  );
}

/** Every distinct GST rate across the draft's lines with its combined tax —
 * an order can mix rates line to line (different HSNs), so the single `tax`
 * figure alone doesn't say which rates made it up. */
function taxByRate(totals: CalcTotals, lines: DraftLine[]): { rate: string; amount: number }[] {
  const byRate = new Map<string, number>();
  totals.lines.forEach((result, index) => {
    const rate = lines[index]?.snapshot.taxRate ?? '0';
    byRate.set(rate, (byRate.get(rate) ?? 0) + result.tax);
  });
  return [...byRate.entries()].map(([rate, amount]) => ({ rate, amount }));
}

/**
 * The running total, Net first. Every figure is the client mirror of the
 * calculation engine — a preview that follows the typing. The server
 * recomputes all of it at save time and *its* numbers are the document's.
 */
export function TotalsCard({ totals, lines }: TotalsCardProps) {
  return (
    <Card depth="soft" style={styles.card}>
      <View style={styles.net}>
        <Text variant="label" color="textMuted">Net payable</Text>
        <Text variant="kpi">{formatMoney(totals.net)}</Text>
      </View>
      <Divider />
      <Expander title="View tax breakdown">
        <Row label="Gross" value={totals.gross} />
        {totals.lineDiscount > 0 ? <Row label="Line discount" value={totals.lineDiscount} /> : null}
        {totals.orderDiscount > 0 ? <Row label="Order discount" value={totals.orderDiscount} /> : null}
        <Row label="Taxable" value={totals.taxable} />
        {taxByRate(totals, lines).map((entry) => (
          <Row key={entry.rate} label={`Tax @ ${entry.rate}%`} value={entry.amount} />
        ))}
        <Divider style={styles.divider} />
        <Row label="Net" value={totals.net} strong />
      </Expander>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space[3] },
  net: { paddingBottom: space[3] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[1] },
  divider: { marginVertical: space[2] },
});
