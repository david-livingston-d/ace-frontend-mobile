import { z } from 'zod';
import { todayIso } from '@/lib/format/date';
import type { PaymentAgainst, PaymentIn } from './types';

/** A decimal string with at most two fractional digits — the same shape
 * `numeric(14,2)` accepts, checked on the *string* so nothing is rounded on
 * the way through (`'1234.50'` stays `'1234.50'`, never becomes `1234.5`). */
const DECIMAL = /^\d+(\.\d{1,2})?$/;
const TOO_MANY_PLACES = /^\d+\.\d{3,}$/;

export const paymentSchema = z.object({
  amount: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      // Ordered so the *specific* complaint wins: "12.345" is a number the
      // user clearly meant, and telling them it isn't one at all would be
      // wrong. Anything else unparseable is simply "enter an amount".
      if (TOO_MANY_PLACES.test(value)) {
        ctx.addIssue({ code: 'custom', message: 'An amount has at most two decimal places' });
        return;
      }
      if (!DECIMAL.test(value)) {
        ctx.addIssue({ code: 'custom', message: 'Enter an amount' });
        return;
      }
      if (!/[1-9]/.test(value)) {
        ctx.addIssue({ code: 'custom', message: 'Enter an amount greater than zero' });
      }
    }),
  payment_mode_id: z.string().min(1, 'Pick a payment mode'),
  // The server raises `future_date` for the same rule; catching it here keeps
  // a rep from losing a filled-in form to a round trip.
  payment_date: z
    .string()
    .refine((value) => value <= todayIso(), "A payment can't be dated in the future"),
  reference: z.string().trim().max(100, 'Keep the reference under 100 characters'),
  remarks: z.string().trim().max(500, 'Keep the remarks under 500 characters'),
});

export type PaymentForm = z.infer<typeof paymentSchema>;

/**
 * The form plus its context -> the wire body. `sales_order_id` is the one
 * field the `against` choice decides: a customer advance is deliberately
 * untagged (it settles nothing in particular and shows on the customer's
 * account), while "this order" and "against invoice" both tag the order the
 * rep came from — the latter differing only in where the rep lands next.
 *
 * `amount` goes over as the exact string that was typed. It is never
 * re-formatted here: the server is the one that rounds and stores, and a
 * client that "tidied" `'20000'` into `'20000.00'` would be one more place
 * money could quietly change shape.
 */
export function toPaymentIn(
  form: PaymentForm,
  { customerId, orderId, against }: { customerId: string; orderId?: string | null; against: PaymentAgainst },
): PaymentIn {
  return {
    customer_id: customerId,
    sales_order_id: against === 'customer' ? null : orderId ?? null,
    payment_date: form.payment_date,
    amount: form.amount,
    payment_mode_id: form.payment_mode_id,
    reference: form.reference || null,
    remarks: form.remarks || null,
  };
}
