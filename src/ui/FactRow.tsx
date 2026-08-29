import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { hit } from './tokens/layout';

export type FactRowProps = {
  label: string;
  /** A plain string takes the row's own `rowStrong` role; anything else is the
   * caller's node (a `StatusChip`, a money figure in a different weight) and is
   * rendered as given. */
  value: React.ReactNode;
  /** Makes the value a link — the customer a payment came from, the order a
   * note ships against. The whole value, not a separate chevron. */
  onPress?: () => void;
  testID?: string;
};

/**
 * One label/value line of a detail card: a muted caption on the left, the fact
 * on the right, both on one baseline.
 *
 * It is the same row on the payment, delivery-note and invoice detail screens
 * (three private copies of it before M4-T10), on the cart/review totals card
 * and in the tax breakdown — so it is a kit primitive rather than something
 * each screen re-derives with its own padding.
 */
export function FactRow({ label, value, onPress, testID }: FactRowProps) {
  const body =
    typeof value === 'string' || typeof value === 'number' ? (
      <Text variant="rowStrong">{String(value)}</Text>
    ) : (
      value
    );

  return (
    <View style={styles.row} testID={testID}>
      <Text variant="caption" color="muted" style={styles.label}>{label}</Text>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" hitSlop={hit.link} style={styles.value}>
          {body}
        </Pressable>
      ) : (
        <View style={styles.value}>{body}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingVertical: space[1] },
  // Both sides shrink rather than push each other off the card: a long label
  // ("Dispatched from") beside a long value is what wrapped mid-word on iOS.
  label: { flexShrink: 1 },
  value: { flexShrink: 1, alignItems: 'flex-end' },
});
