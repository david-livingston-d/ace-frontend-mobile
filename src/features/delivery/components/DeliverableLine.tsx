import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Stepper, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { DeliverableLine as DeliverableLineType } from '../types';

export type DeliverableLineProps = {
  line: DeliverableLineType;
  /** Current stepper value — owned by the screen (per-line state keyed by
   * `so_line_id`), not this component. */
  qty: number;
  onChange: (qty: number) => void;
  /** The line the last `exceeds_eligible` 422 named — outlined so the rep can
   * find it again after the deliverable refetch. */
  highlighted?: boolean;
};

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text variant="caption" color="textSubtle">{label}</Text>
      <Text variant="bodySm">{value}</Text>
    </View>
  );
}

/** One deliverable order line (mockup D3) — a line with nothing left to ship
 * (`eligible === '0'`) shows no stepper at all, only why. */
export function DeliverableLine({ line, qty, onChange, highlighted }: DeliverableLineProps) {
  const theme = useTheme();
  const eligible = Number(line.eligible);
  const disabled = eligible <= 0;

  return (
    <Card
      depth="soft"
      style={[styles.card, highlighted ? { borderColor: theme.colors.tone.danger.fg, borderWidth: 1 } : null]}
    >
      <Text variant="body">
        {line.product_name}
        {line.variant_label ? ` · ${line.variant_label}` : ''}
      </Text>
      <Text variant="caption" color="textMuted">{line.sku}</Text>
      <View style={styles.miniTable}>
        <MiniStat label="Ordered" value={line.ordered} />
        <MiniStat label="Reserved" value={line.reserved} />
        <MiniStat label="Delivered" value={line.delivered} />
        <MiniStat label="Eligible" value={line.eligible} />
      </View>
      {disabled ? (
        <Text variant="bodySm" color="textSubtle" style={styles.disabledHint}>
          Nothing eligible to deliver on this line
        </Text>
      ) : (
        <View style={styles.stepperRow}>
          <Stepper label={`${line.sku} quantity`} value={qty} min={0} max={eligible} onChange={onChange} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space[3] },
  miniTable: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] },
  miniStat: { alignItems: 'flex-start' },
  disabledHint: { marginTop: space[3] },
  stepperRow: { marginTop: space[3], alignItems: 'flex-end' },
});
