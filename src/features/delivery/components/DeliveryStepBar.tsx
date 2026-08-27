import React from 'react';
import { StepBar } from '@/ui';
import { DELIVERY_STEPS, deliveryStep, deliveryNextAction } from '../steps';

export type DeliveryStepBarProps = {
  status: string;
  /** Whether the viewer holds the permission the *next* step needs
   * (`delivery_note.submit`/`delivery_note.mark_delivered`) — decided by the
   * caller so this component stays permission-agnostic. */
  canContinue: boolean;
  continueLoading?: boolean;
  onContinue: () => void;
};

/** The DN detail's `StepBar` (mockup D3): reads the note's real `status`
 * (never guesses a step forward — Global Constraints "server is the
 * authority"), and shows CONTINUE greyed out with a "Needs <code>" hint
 * instead of hiding it outright when the viewer lacks the next step's
 * permission — so a rep without `delivery_note.submit` still sees *what*
 * would move this note along, just not the button to do it. */
export function DeliveryStepBar({ status, canContinue, continueLoading, onContinue }: DeliveryStepBarProps) {
  const step = deliveryStep(status);
  const next = deliveryNextAction(status);

  return (
    <StepBar
      steps={DELIVERY_STEPS}
      current={step.current}
      failed={step.failed}
      continueLabel={next?.label}
      continueDisabled={!!next && !canContinue}
      continueHint={next ? `Needs ${next.permission}` : undefined}
      continueLoading={continueLoading}
      onContinue={next && canContinue ? onContinue : undefined}
    />
  );
}
