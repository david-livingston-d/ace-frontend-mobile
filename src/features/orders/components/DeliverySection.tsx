import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Banner, Card, Divider, HeaderRow, StatusChip, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatDate } from '@/lib/format/date';
import { formatQty, remainingQty } from '@/lib/format/qty';
import { statusLabel, statusTone } from '@/lib/sales/status';
import { DeliveryNoteRow } from '@/features/delivery/components/DeliveryNoteRow';
import type { DeliveryNoteSummary, SalesOrderLine, Shortage } from '../types';

export type DeliverySectionProps = {
  deliveryNotes: DeliveryNoteSummary[];
  shortages: Shortage[];
  /** The order's lines, for the per-line ordered/delivered/pending table the
   * `order-detail` frame puts in this card. */
  lines: SalesOrderLine[];
  deliveryStatus: string;
  onOpenDn: (id: string) => void;
};

/** The Delivery card: how much of each line has actually shipped, then the
 * delivery notes it shipped on, then anything still short. */
export function DeliverySection({ deliveryNotes, shortages, lines, deliveryStatus, onOpenDn }: DeliverySectionProps) {
  const openShortages = shortages.filter((s) => s.status !== 'resolved');

  return (
    <Card>
      <HeaderRow>
        <Text variant="label" color="muted">Delivery</Text>
        <StatusChip
          tone={statusTone('delivery_status', deliveryStatus)}
          label={statusLabel('delivery_status', deliveryStatus)}
          size="sm"
        />
      </HeaderRow>

      <View style={styles.table}>
        {/* The header is `caption`, not `label`: four 2 em-spaced uppercase
            words do not fit four columns of a phone-width card — "Delivered"
            wrapped. The frame's own mini-table header is lower-case 9 px too. */}
        <View style={styles.tableRow}>
          <Text variant="caption" color="subtle" style={styles.lineCol} numberOfLines={1}>Line</Text>
          <Text variant="caption" color="subtle" style={styles.numberCol} align="right" numberOfLines={1}>Ordered</Text>
          <Text variant="caption" color="subtle" style={styles.numberCol} align="right" numberOfLines={1}>Delivered</Text>
          <Text variant="caption" color="subtle" style={styles.numberCol} align="right" numberOfLines={1}>Pending</Text>
        </View>
        {lines.map((line) => (
          <View key={line.id} style={styles.tableRow}>
            <Text variant="row" style={styles.lineCol} numberOfLines={1}>
              {line.product_name}
              {line.variant_label ? ` · ${line.variant_label}` : ''}
            </Text>
            <Text variant="row" style={styles.numberCol} align="right">{formatQty(line.qty)}</Text>
            <Text variant="row" style={styles.numberCol} align="right">{formatQty(line.delivered_qty)}</Text>
            <Text variant="rowStrong" style={styles.numberCol} align="right">
              {remainingQty(line.qty, line.delivered_qty)}
            </Text>
          </View>
        ))}
      </View>

      {deliveryNotes.length > 0 ? (
        <>
          <Divider style={styles.rule} />
          {deliveryNotes.map((dn) => (
            <DeliveryNoteRow key={dn.id} dn={dn} onPress={() => onOpenDn(dn.id)} />
          ))}
        </>
      ) : null}

      {openShortages.length > 0 ? (
        <View style={styles.shortages}>
          {openShortages.map((s) => (
            <Banner
              key={s.id}
              tone="warning"
              title={`${s.sku ?? 'Line'} short by ${s.short_qty}`}
              body={s.expected_availability_date ? `Expected ${formatDate(s.expected_availability_date)}` : undefined}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  table: { marginTop: space[3], gap: space[2] },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  lineCol: { flex: 1 },
  // Fixed-basis number columns so the four values line up column-wise down the
  // table instead of drifting with each product name's length.
  numberCol: { flexBasis: '20%' },
  rule: { marginVertical: space[3] },
  shortages: { marginTop: space[3], gap: space[2] },
});
