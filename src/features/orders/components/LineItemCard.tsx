import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import type { SalesOrderLine } from '../types';

export type LineItemCardProps = { line: SalesOrderLine };

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text variant="caption" color="textSubtle">{label}</Text>
      <Text variant="bodySm">{value}</Text>
    </View>
  );
}

export function LineItemCard({ line }: LineItemCardProps) {
  return (
    <Card depth="soft" style={styles.card}>
      <Text variant="body">
        {line.product_name}
        {line.variant_label ? ` · ${line.variant_label}` : ''}
      </Text>
      <Text variant="caption" color="textMuted">{line.sku}</Text>
      <View style={styles.qtyRow}>
        <Text variant="bodySm" color="textMuted">
          {line.qty} × {formatMoney(line.rate)}
        </Text>
        <Text variant="money">{formatMoney(line.line_total)}</Text>
      </View>
      <View style={styles.miniTable}>
        <MiniStat label="Ordered" value={line.qty} />
        <MiniStat label="Reserved" value={line.reserved_qty} />
        <MiniStat label="Delivered" value={line.delivered_qty} />
        <MiniStat label="Remaining" value={line.remaining_qty} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space[3] },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[2] },
  miniTable: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] },
  miniStat: { alignItems: 'flex-start' },
});
