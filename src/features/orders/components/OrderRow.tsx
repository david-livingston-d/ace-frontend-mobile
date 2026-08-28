import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RowCard, StatusChip, Text, useTheme, type MetricItem } from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatQty, remainingQty } from '@/lib/format/qty';
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

/**
 * One order, as the `orders` preview frame draws it: number + phase badge,
 * "customer · ₹net", the delivery/payment badges on their own wrapped line,
 * the four quantities, and the committed date in the row's due tone.
 *
 * Shared between Home's "recent orders" and the Orders register — one row
 * design, so the two screens can never drift apart.
 */
export function OrderRow({ order, onPress, showSalesUser }: OrderRowProps) {
  const theme = useTheme();
  const committedTone = order.expected_delivery_date ? dueTone(order.expected_delivery_date, todayIso()) : 'neutral';
  const committedLabel = order.expected_delivery_date
    ? `Due ${formatDate(order.expected_delivery_date)}`
    : 'No date committed';

  const metrics: MetricItem[] = [
    { label: 'Qty', value: formatQty(order.ordered_qty) },
    { label: 'Reserved', value: formatQty(order.reserved_qty) },
    { label: 'To deliver', value: remainingQty(order.ordered_qty, order.delivered_qty) },
    {
      label: 'To collect',
      value: formatMoney(order.outstanding),
      // Only tinted while money is actually owed — a settled order's zero must
      // not read as a warning.
      tone: Number(order.outstanding) > 0 ? 'danger' : undefined,
    },
  ];

  return (
    <RowCard
      onPress={onPress}
      title={order.number}
      badges={<StatusChip tone={phaseTone(order.phase)} label={phaseLabel(order.phase)} size="sm" />}
      // The status badges ride in the meta slot rather than beside the title:
      // the frame gives them their own wrapped line, and three badges plus an
      // order number never fit one row on a phone.
      meta={
        <View style={styles.meta}>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {order.customer_name} · {formatMoney(order.net)}
          </Text>
          <View style={styles.chipsRow}>
            <StatusChip
              tone={statusTone('delivery_status', order.delivery_status)}
              label={statusLabel('delivery_status', order.delivery_status)}
              size="sm"
            />
            <StatusChip
              tone={statusTone('payment_status', order.payment_status)}
              label={statusLabel('payment_status', order.payment_status)}
              size="sm"
            />
          </View>
        </View>
      }
      metrics={metrics}
      // The committed date is the row's last line, full width and in its own
      // due tone (`orders` frame) — not a trailing column, which would take
      // the width the four quantities need.
      footer={
        <Text variant="caption" color={theme.colors.tone[committedTone].fg}>
          {committedLabel}
          {showSalesUser && order.sales_user_name ? ` · ${order.sales_user_name}` : ''}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  meta: { gap: space[1] + 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips - 2 },
});
