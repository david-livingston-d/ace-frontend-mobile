import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckSquare, Square } from 'lucide-react-native';
import { Card, IconButton, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import { formatQty } from '@/lib/format/qty';
import type { InvoiceableItem } from '../types';

export type InvoiceableDnRowProps = {
  item: InvoiceableItem;
  selected: boolean;
  onToggle: () => void;
};

/**
 * One delivered note on the create-invoice screen (`create-invoice` frame): a
 * tick box, the note's number and what it carries, and what it is worth.
 *
 * There is no quantity control anywhere on this row on purpose — invoicing is
 * **whole-DN** (PRD §21): a note is either on the invoice entire or not on it
 * at all, so the only choice the row offers is the tick.
 */
export function InvoiceableDnRow({ item, selected, onToggle }: InvoiceableDnRowProps) {
  const units = Number(item.qty_total) === 1 ? 'unit' : 'units';
  return (
    <Card padding="row" onPress={onToggle} testID={`invoiceable-${item.dn_id}`}>
      <View style={styles.row}>
        <IconButton
          icon={selected ? CheckSquare : Square}
          // Addressed by the note it selects, so a screen reader (and a test)
          // hears "Select DN-…", never four identical "Select" buttons.
          label={`${selected ? 'Deselect' : 'Select'} ${item.number}`}
          onPress={onToggle}
        />
        <View style={styles.main}>
          <Text variant="rowTitle" numberOfLines={1}>{item.number}</Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {`${item.delivered_on ? formatDate(item.delivered_on) : 'Delivered'} · ${formatQty(item.qty_total)} ${units}`}
          </Text>
        </View>
        <Text variant="rowStrong">{formatMoney(item.net)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  main: { flex: 1, gap: space[1] },
});
