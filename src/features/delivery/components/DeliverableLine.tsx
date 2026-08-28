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
 * and a stepper capped at what is actually eligible — with "Deliverable now ·
 * reserved" underneath, which is the pair that explains the cap, plus a muted
 * "Ordered · Delivered" caption for the rest of the picture. A line with
 * nothing left to ship (`eligible === '0'`) shows no stepper at all, only why.
 *
 * Fix round 1 (finding 4): the footer used to read "Remaining N", but
 * `eligible` is reservation-capped, not order-capped — an order of 100 with
 * 40 delivered and only 20 reserved shows `eligible: '20'` while 60 units are
 * still genuinely owed. "Remaining 20" read as if 20 were all that was left
 * on the order; "Deliverable now 20" says what it actually is (what this
 * screen can ship *right now*), and the new Ordered/Delivered caption
 * supplies the fuller figure.
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
          : `Deliverable now ${formatQty(line.eligible)} · reserved ${formatQty(line.reserved)}`}
      </Text>
      <Text variant="caption" color="subtle" style={styles.footer}>
        {`Ordered ${formatQty(line.ordered)} · Delivered ${formatQty(line.delivered)}`}
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
