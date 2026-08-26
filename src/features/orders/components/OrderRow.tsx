import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text, StatusChip, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate, dueTone, todayIso } from '@/lib/format/date';
import { phaseLabel, phaseTone, statusLabel, statusTone } from '@/lib/sales/status';
import type { SalesOrderListItem } from '@/lib/api/types';

export type OrderRowProps = {
  order: SalesOrderListItem;
  onPress?: () => void;
  /** M2's team-wide lists pass this so a row reads whose order it is; Home's
   * "own" scope view omits it since every row is already the viewer's own. */
  showSalesUser?: boolean;
};

// Shared between Home's "recent orders" and M2's Orders register — keep this
// component's shape stable, since a later task's list depends on it as-is.
export function OrderRow({ order, onPress, showSalesUser }: OrderRowProps) {
  const theme = useTheme();
  const committedTone = order.expected_delivery_date ? dueTone(order.expected_delivery_date, todayIso()) : 'neutral';
  const committedLabel = order.expected_delivery_date ? formatDate(order.expected_delivery_date) : 'No date committed';

  const content = (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.main}>
        <View style={styles.headerLine}>
          <Text variant="body" numberOfLines={1} style={styles.number}>{order.number}</Text>
          <StatusChip tone={phaseTone(order.phase)} label={phaseLabel(order.phase)} size="sm" />
        </View>
        <Text variant="bodySm" color="textMuted" numberOfLines={1}>
          {order.customer_name} · {formatMoney(order.net)}
        </Text>
        <View style={styles.chipsRow}>
          <StatusChip tone={statusTone('delivery_status', order.delivery_status)} label={statusLabel('delivery_status', order.delivery_status)} size="sm" />
          <StatusChip tone={statusTone('payment_status', order.payment_status)} label={statusLabel('payment_status', order.payment_status)} size="sm" />
        </View>
        <Text variant="caption" color={theme.colors.tone[committedTone].fg} style={styles.committed}>
          {committedLabel}
          {showSalesUser && order.sales_user_name ? ` · ${order.sales_user_name}` : ''}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.colors.textSubtle} />
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space[2],
  },
  main: { flex: 1, gap: space[1] },
  headerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  number: { flex: 1 },
  chipsRow: { flexDirection: 'row', gap: space[2] },
  committed: { marginTop: space[1] },
});
