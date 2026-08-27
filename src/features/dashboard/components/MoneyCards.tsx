import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KpiTile } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney, formatMoneyShort } from '@/lib/format/money';
import type { DashboardSalesOut } from '../types';

export type MoneyCardsProps = {
  collectedThisMonth: string;
  outstanding: DashboardSalesOut['outstanding'];
  /** M3 Task 4: the OUTSTANDING tile opens the Payments tab's "By customer"
   * view — omitted only in tests that don't care about the tap. */
  onPressOutstanding?: () => void;
};

// HomeScreen only mounts this when `collected_this_month !== null` — i.e. the
// viewer has `payment.read` — per the backend's gating contract.
export function MoneyCards({ collectedThisMonth, outstanding, onPressOutstanding }: MoneyCardsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <KpiTile label="COLLECTED" value={formatMoneyShort(collectedThisMonth)} hint={formatMoney(collectedThisMonth)} />
      </View>
      {outstanding ? (
        <View style={styles.cell}>
          <KpiTile
            label="OUTSTANDING"
            value={formatMoneyShort(outstanding.total)}
            tone="danger"
            hint={`overdue ${formatMoney(outstanding.overdue)}`}
            onPress={onPressOutstanding}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  cell: { flex: 1 },
});
