import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';
import { Text } from './Text';
import { space } from './tokens/spacing';

export type StepBarProps = {
  steps: string[];
  current: number;
  failed?: boolean;
  continueLabel?: string;
  /** Renders CONTINUE greyed out with `continueHint` underneath instead of
   * calling `onContinue` — the document's next step exists, but the viewer
   * lacks the permission for it (e.g. "Someone with dispatch rights needs to
   * finish this" — see `src/lib/permissions/copy.ts`). Set this
   * instead of simply omitting `onContinue`, which reads as "no next step"
   * rather than "blocked". */
  continueDisabled?: boolean;
  continueHint?: string;
  continueLoading?: boolean;
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
export function StepBar({ steps, current, failed, continueLabel, continueDisabled, continueHint, continueLoading, onContinue }: StepBarProps) {
  const showAction = !!continueLabel && (!!onContinue || !!continueDisabled);
  return (
    <View>
      <ProgressBar steps={steps} current={current} failed={failed} />
      {showAction ? (
        <View style={styles.action}>
          <Button
            label={continueLabel!}
            onPress={onContinue ?? (() => {})}
            disabled={continueDisabled}
            loading={continueLoading}
            fullWidth
          />
          {continueDisabled && continueHint ? (
            <Text variant="bodySm" color="textMuted" style={styles.hint}>
              {continueHint}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: space[4] },
  hint: { marginTop: space[2], textAlign: 'center' },
});
