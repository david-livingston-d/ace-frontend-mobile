import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatQty } from '@/lib/format/qty';
import type { SalesOrderLine } from '../types';

export type LineItemCardProps = { line: SalesOrderLine };

/**
 * One line of the order-detail Items card (`order-detail` frame): what it is,
 * what it cost, what it came to. It is a *row* inside that card, not a card of
 * its own — a card per line turned the section into a stack of floating slabs.
 * The per-line quantities live in the Delivery card, where the frame puts them.
 */
export function LineItemCard({ line }: LineItemCardProps) {
  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <Text variant="rowStrong" numberOfLines={2}>
          {line.product_name}
          {line.variant_label ? ` · ${line.variant_label}` : ''}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {line.sku} · {formatMoney(line.rate)} × {formatQty(line.qty)}
        </Text>
      </View>
      <Text variant="rowStrong">{formatMoney(line.line_total)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  main: { flex: 1, gap: space[1] - 2 },
});
