import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';
import { space } from './tokens/spacing';

export type StepBarProps = {
  steps: string[];
  current: number;
  failed?: boolean;
  continueLabel?: string;
  onContinue?: () => void;
};

/**
 * `ProgressBar` wrapped with an optional "Continue" action — the shape every
 * server-driven multi-step document renders its status as (a DN's
 * `draft → submitted → delivered`, a payment's `draft → submitted`). The step
 * shown is always the document's real `status` from the last response the
 * caller fetched or seeded; a mid-way failure leaves `current`/`failed` at
 * that real step rather than the UI guessing it forward, and `onContinue` is
 * how the caller re-drives the next step from wherever the server actually
 * left it.
 */
export function StepBar({ steps, current, failed, continueLabel, onContinue }: StepBarProps) {
  return (
    <View>
      <ProgressBar steps={steps} current={current} failed={failed} />
      {continueLabel && onContinue ? (
        <View style={styles.action}>
          <Button label={continueLabel} onPress={onContinue} fullWidth />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: space[4] },
});
