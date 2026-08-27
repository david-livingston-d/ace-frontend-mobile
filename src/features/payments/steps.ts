import { cmpMoney } from '@/lib/sales/calc';
import type { PaymentDetail } from './types';

/**
 * A payment's three-step track. Unlike a delivery note — whose `status` alone
 * says how far it got — a payment's last step is not a status at all: the
 * server has only `draft`/`submitted`/`cancelled`, and "allocated" is the
 * presence of allocation rows. So this reads both, and only what the server
 * actually reported (Global Constraints: "server is the authority for
 * multi-step flows" — never a step guessed forward from what was just sent).
 */
export const PAYMENT_STEPS = ['Recorded', 'Submitted', 'Allocated'];

export function paymentStep(payment: PaymentDetail): { current: number; failed: boolean } {
  // A cancelled payment, like a cancelled order, keeps no record of how far it
  // had got — so it fails at step 0 rather than inventing a position.
  if (payment.status === 'cancelled') return { current: 0, failed: true };
  if (payment.status !== 'submitted') return { current: 0, failed: false };
  // Submitted with nothing settled is a real, finished state — an advance on
  // the customer's account (PRD §26) — not an unfinished allocation.
  return { current: payment.allocations.length > 0 ? 2 : 1, failed: false };
}

/**
 * The detail's CONTINUE action: the next step, and the permission it needs.
 * `null` once there is nothing left to drive — a cancelled payment, or a
 * submitted one with every rupee already spent.
 */
export function paymentNextAction(payment: PaymentDetail): { label: string; permission: string } | null {
  if (payment.status === 'draft') return { label: 'Submit', permission: 'payment.submit' };
  if (payment.status === 'submitted' && cmpMoney(payment.unallocated, '0') > 0) {
    return { label: 'Allocate', permission: 'payment.allocate' };
  }
  return null;
}
