import React from 'react';
import { Text } from '@/ui';
import { formatMoney } from '@/lib/format/money';
import { cmpMoney, subMoney } from '@/lib/sales/calc';

export type ExcessInfoProps = {
  /** What is being paid, as typed (may be half-finished — the helpers read a
   * partial string as zero rather than NaN). */
  amount: string;
  /** The order's own `summary.receivable`. */
  receivable: string;
};

/** Paying more than an order still owes is allowed (PRD §26): the excess
 * simply lands on the customer's account as an advance. Saying so up front is
 * the difference between a deliberate over-payment and a typo the rep only
 * discovers on the payment detail afterwards. */
export function ExcessInfo({ amount, receivable }: ExcessInfoProps) {
  if (cmpMoney(amount, receivable) <= 0) return null;
  return (
    <Text variant="bodySm" color="textMuted">
      {`Excess ${formatMoney(subMoney(amount, receivable))} will become customer advance`}
    </Text>
  );
}
