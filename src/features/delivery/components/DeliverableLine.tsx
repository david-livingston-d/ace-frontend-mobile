import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Stepper, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { shadow } from '@/ui/tokens/elevation';
import { formatQty } from '@/lib/format/qty';
import type { DeliverableLine as DeliverableLineType } from '../types';

export type DeliverableLineProps = {
  line: DeliverableLineType;
  /** Current stepper value — owned by the screen (per-line state keyed by
   * `so_line_id`), not this component. */
  qty: number;
  onChange: (qty: number) => void;
  /** The line the last `exceeds_eligible` 422 named — ringed so the rep can
   * find it again after the deliverable refetch. */
  highlighted?: boolean;
};

/**
 * One deliverable order line (`record-delivery` frame): what it is, its SKU,
 * and a stepper capped at what is actually eligible — with "remaining ·
 * reserved" underneath, which is the pair that explains the cap. A line with
 * nothing left to ship (`eligible === '0'`) shows no stepper at all, only why.
 */
export function DeliverableLine({ line, qty, onChange, highlighted }: DeliverableLineProps) {
  const theme = useTheme();
  const eligible = Number(line.eligible);
  const disabled = eligible <= 0;

  return (
    <Card
      padding="row"
      style={[
        styles.card,
        // Through `shadow()` rather than a hand-written border so the ring
        // degrades the same way every other ringed surface in the kit does.
        highlighted ? shadow('card', theme.mode, { color: theme.colors.errRing, width: 1.5 }) : null,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.body}>
          <Text variant="rowTitle" numberOfLines={2}>
            {line.product_name}
            {line.variant_label ? ` · ${line.variant_label}` : ''}
          </Text>
          <Text variant="caption" color="muted">{line.sku}</Text>
        </View>
        {disabled ? null : (
          <Stepper label={`${line.sku} quantity`} value={qty} min={0} max={eligible} onChange={onChange} />
        )}
      </View>
      <Text variant="caption" color={disabled ? 'subtle' : 'muted'} style={styles.footer}>
        {disabled
          ? 'Nothing eligible to deliver on this line'
          : `Remaining ${formatQty(line.eligible)} · reserved ${formatQty(line.reserved)}`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  body: { flex: 1, gap: space[1] },
  footer: { marginTop: space[1] - 2 },
});
