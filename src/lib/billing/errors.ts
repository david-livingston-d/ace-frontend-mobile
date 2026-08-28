import { getErrorDetailField, toApiError } from '@/lib/api/errors';
import { BILLING_ERRORS, DELIVERY_ERRORS, SALES_ERRORS } from '@/lib/sales/errors';

/**
 * Everything the billing request can fail on that is *not* an invoice-side
 * code: it names delivery notes (`mixed_dispatch_warehouse`, raised while the
 * selected notes are validated) and it happens against an order
 * (`invalid_phase`). Delivery wins over sales where both define a code, which
 * is the same precedence the web's `getDeliveryErrorMessage` → sales chain has.
 */
const FALLBACK_ERRORS: Record<string, string> = { ...SALES_ERRORS, ...DELIVERY_ERRORS };

/**
 * Friendly copy for the billing error codes — the mobile port of the web's
 * `getBillingErrorMessage` (`ace-frontend-web/src/lib/billing.ts`).
 *
 * `dn_not_eligible` is prefixed with the note it was about: "a delivery note
 * isn't eligible" with two notes on screen leaves the rep guessing which one
 * to untick, and the server sends `dn_number` in the error body precisely so
 * the client can say which. Anything unmapped falls through to the delivery
 * vocabulary (and from there to sales), which already covers the order- and
 * note-side codes an invoice request can hit; anything unmapped *there* keeps
 * the server's own message rather than inventing one.
 *
 * A plain map + `getErrorMessage(err, map)` cannot do this — the prefix is
 * read off the error body — which is why billing gets a function of its own.
 */
export function getBillingErrorMessage(err: unknown): string {
  const e = toApiError(err);
  const message = BILLING_ERRORS[e.code];
  if (!message) return FALLBACK_ERRORS[e.code] ?? e.message;
  if (e.code === 'dn_not_eligible') {
    const dnNumber = getErrorDetailField(err, 'dn_number');
    if (dnNumber) return `${dnNumber}: ${message}`;
  }
  return message;
}
