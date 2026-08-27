import React from 'react';
import { StepBar } from '@/ui';
import { PAYMENT_STEPS, paymentStep, paymentNextAction } from '../steps';
import type { PaymentDetail } from '../types';

export type PaymentStepBarProps = {
  payment: PaymentDetail;
  /** Whether the viewer holds the permission the *next* step needs — decided
   * by the caller so this stays permission-agnostic (same contract as
   * `DeliveryStepBar`). */
  canContinue: boolean;
  continueLoading?: boolean;
  onContinue: () => void;
};

/** The payment's Recorded → Submitted → Allocated track, read off the
 * payment the server last returned. CONTINUE is greyed out with a
 * "Needs <code>" hint rather than hidden when the viewer can't drive the next
 * step — a rep without `payment.allocate` still sees that allocation is what
 * comes next, just not the button for it. */
export function PaymentStepBar({ payment, canContinue, continueLoading, onContinue }: PaymentStepBarProps) {
  const step = paymentStep(payment);
  const next = paymentNextAction(payment);

  return (
    <StepBar
      steps={PAYMENT_STEPS}
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
