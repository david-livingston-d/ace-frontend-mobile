import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './Text';
import { space } from './tokens/spacing';

export type SectionLabelProps = { children: string };

/** The uppercase caption above a group of controls inside a sheet or a form.
 * Both filter sheets had their own copy of this spacing. */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text variant="label" color="muted" style={styles.label}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({ label: { marginTop: space[4], marginBottom: space[2] } });
