import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, SegmentedControl } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { PaymentAgainst } from '../types';

export type AgainstSelectorProps = {
  value: PaymentAgainst;
  onChange: (value: PaymentAgainst) => void;
  /** "This order" is only offered when there *is* an order in context — a
   * payment recorded from a customer's page has nothing to tag. */
  hasOrder: boolean;
};

/** Mockup D1's "Against" row. The choice decides one wire field
 * (`sales_order_id`) and one navigation branch (whether an allocation step
 * follows) — see `schema.toPaymentIn` and `RecordPaymentScreen`. */
export function AgainstSelector({ value, onChange, hasOrder }: AgainstSelectorProps) {
  // Fix round 1 (finding 1): "Customer advance" truncated to "CUSTOMER
  // ADVA…" in the three-segment control on device — shortened to "Advance"
  // per the controller ruling so all three segments read in full. The wire
  // value ('customer') is unchanged.
  const options = [
    ...(hasOrder ? [{ value: 'order', label: 'This order' }] : []),
    { value: 'customer', label: 'Advance' },
    { value: 'invoice', label: 'Against invoice' },
  ];

  return (
    <View style={styles.container}>
      <Text variant="label" color="textMuted">Against</Text>
      <SegmentedControl options={options} value={value} onChange={(v) => onChange(v as PaymentAgainst)} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: space[2] } });
