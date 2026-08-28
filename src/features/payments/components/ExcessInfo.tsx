import { formatMoney } from '@/lib/format/money';
import { cmpMoney, subMoney } from '@/lib/sales/calc';

/**
 * Paying more than an order still owes is allowed (PRD §26): the excess simply
 * lands on the customer's account as an advance. Saying so up front is the
 * difference between a deliberate over-payment and a typo the rep only
 * discovers on the payment detail afterwards.
 *
 * A string rather than a component since M4-T8: it is the amount field's own
 * helper line (`record-payment` frame — the note sits inside the `.moneyfield`,
 * under the figure it is about), not a paragraph floating beside it.
 *
 * @param amount what is being paid, as typed — may be half-finished, which the
 *   money helpers read as zero rather than NaN.
 * @param receivable the order's own `summary.receivable`.
 */
export function excessNote(amount: string, receivable: string): string | undefined {
  if (cmpMoney(amount, receivable) <= 0) return undefined;
  return `Excess ${formatMoney(subMoney(amount, receivable))} will become customer advance`;
}
