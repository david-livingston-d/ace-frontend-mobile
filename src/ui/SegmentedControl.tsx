import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from './Chip';
import { space } from './tokens/spacing';

export type SegmentedControlOption = { value: string; label: string };

export type SegmentedControlProps = {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
};

/**
 * A row of mutually-exclusive `Chip`s — this slice's "Against: this order /
 * customer advance / against invoice" toggle and payment-mode chips both are
 * one of these, so it's built on `Chip` rather than a new pill primitive.
 */
export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
