import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from '@/ui';
import { space } from '@/ui/tokens/spacing';

export const WIZARD_STEP_NAMES = ['Customer', 'Products', 'Cart', 'Review'];

export type StepHeaderProps = {
  /** 1-based: Customer 1, Products 2, Cart 3, Review 4. */
  step: number;
  hint?: string;
};

/** The one place the wizard says where you are. Kept as a component rather
 * than a navigator header so each step can sit inside its own `Screen` (with
 * its own back behaviour) and still read identically. */
export function StepHeader({ step, hint }: StepHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="label" color="textMuted">{`Step ${step} of ${WIZARD_STEP_NAMES.length}`}</Text>
      {hint ? <Text variant="bodySm" color="textMuted" style={styles.hint}>{hint}</Text> : null}
      <View style={styles.bar}>
        <ProgressBar steps={WIZARD_STEP_NAMES} current={step - 1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: space[3] },
  hint: { marginTop: space[1] },
  bar: { marginTop: space[2] },
});
