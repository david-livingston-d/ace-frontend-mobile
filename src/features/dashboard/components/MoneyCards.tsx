import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KpiTile } from '@/ui';
import { gapGrid } from '@/ui/tokens/spacing';
import { formatMoney, formatMoneyShort } from '@/lib/format/money';
import type { DashboardSalesOut } from '../types';

export type MoneyCardsProps = {
  collectedThisMonth: string;
  outstanding: DashboardSalesOut['outstanding'];
  /** M3 Task 4: the OUTSTANDING tile opens the Payments tab's "By customer"
   * view — omitted only in tests that don't care about the tap. */
  onPressOutstanding?: () => void;
};

/**
 * One money figure per note card (`home-head`'s second `.gr2`). The tone lives
 * in the number and in the card's own drop shadow — an outstanding balance
 * glows faintly red rather than sitting on a coloured slab.
 *
 * The tile itself is the kit's `KpiTile` in its `note` / left-aligned form
 * (M4-T10): this file used to carry a second, near-identical implementation of
 * the same card, which is exactly how two tiles drift apart.
 */
export function MoneyCards({ collectedThisMonth, outstanding, onPressOutstanding }: MoneyCardsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <KpiTile
          variant="note"
          align="left"
          label="Collected"
          value={formatMoneyShort(collectedThisMonth)}
          hint={`${formatMoney(collectedThisMonth)} this month`}
        />
      </View>
      {outstanding ? (
        <View style={styles.cell}>
          <KpiTile
            variant="note"
            align="left"
            label="Outstanding"
            value={formatMoneyShort(outstanding.total)}
            hint={`overdue ${formatMoney(outstanding.overdue)}`}
            tone="danger"
            onPress={onPressOutstanding}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: gapGrid },
  cell: { flex: 1 },
});
