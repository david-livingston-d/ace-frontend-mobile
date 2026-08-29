import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider, Expander, FactRow, Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatRate } from '@/lib/format/rate';
import type { CalcTotals } from '@/lib/sales/calc';
import type { DraftLine } from '../store/draft';

export type TotalsCardProps = {
  totals: CalcTotals;
  /** In `draftLines` order, so `totals.lines[i]` belongs to `lines[i]`. */
  lines: DraftLine[];
};

/** The kit's `FactRow`, with the totals ladder's own lighter value weight —
 * this card is a running preview, not a set of facts about a saved document,
 * and a column of `rowStrong` figures competed with the Net below it. */
function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <FactRow label={label} value={<Text variant="row" color={tone}>{value}</Text>} />;
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
 * The running total (`wizard-3-cart` / `wizard-4-review`): items, gross,
 * discount, taxable, the per-rate tax behind an expander, then Net in the
 * money role. A small `note` card rather than a full one — it is the summary
 * *of* the lines above it, not another document.
 *
 * Every figure is the client mirror of the calculation engine — a preview that
 * follows the typing. The server recomputes all of it at save time and *its*
 * numbers are the document's.
 */
export function TotalsCard({ totals, lines }: TotalsCardProps) {
  const theme = useTheme();
  const discount = totals.lineDiscount + totals.orderDiscount;
  const units = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <Card variant="note" style={styles.card}>
      <Row
        label="Items"
        value={`${lines.length} ${lines.length === 1 ? 'line' : 'lines'} · ${units} units`}
      />
      <Row label="Gross" value={formatMoney(totals.gross)} />
      {discount > 0 ? (
        <Row label="Discount" value={`−${formatMoney(discount)}`} tone={theme.colors.tone.danger.fg} />
      ) : null}
      <Row label="Taxable" value={formatMoney(totals.taxable)} />

      <Expander title="View tax breakdown">
        {taxByRate(totals, lines).map((entry) => (
          <Row key={entry.rate} label={`Tax @ ${formatRate(entry.rate)}%`} value={formatMoney(entry.amount)} />
        ))}
      </Expander>

      <Divider />
      <View style={styles.net}>
        <Text variant="label" color="muted">Net</Text>
        <Text variant="money">{formatMoney(totals.net)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space[3] },
  net: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space[3] },
});
