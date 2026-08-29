import type { QueryClient } from '@tanstack/react-query';
import { keys } from './keys';

/**
 * Every place a mutation touching money can leave something stale — a freshly
 * created/updated/verified/cancelled sales order, a payment recorded or
 * allocated, a delivery note submitted. Generalises what M2's
 * `invalidateOrderSideEffects` (orders/hooks.ts) did for order-only mutations,
 * so M3's payment/DN mutations get the same coverage without duplicating it.
 *
 * Deliberately does **not** invalidate `keys.order(id)` — only a mutation's own
 * response carries the `warnings`/`allocations` it just produced (e.g.
 * `credit_limit_exceeded`, `different_order`); a plain `GET` never echoes them
 * back. Invalidating here would trigger a refetch that silently drops what the
 * mutation just returned. Callers instead seed the order/payment detail cache
 * directly from the mutation's response (see `orders/hooks.ts`'s `afterSave`)
 * — `orderId`/`paymentId` here are only for the *other* things that response
 * doesn't carry (its own timeline, its customer's financial summary, every
 * register it can appear in).
 */
export function invalidateMoneySideEffects(
  qc: QueryClient,
  { orderId, customerId, paymentId, invoiceId }: {
    orderId?: string | null;
    customerId?: string | null;
    paymentId?: string | null;
    invoiceId?: string | null;
  } = {},
) {
  // The order register (any params/limit variant already cached).
  qc.invalidateQueries({ queryKey: ['list', '/sales-orders'] });
  // Home's "recent orders" strip — a plain (non-infinite) `/sales-orders`
  // query under `keys.orders(params)`, a different key space from the
  // register's `['list', ...]` above.
  qc.invalidateQueries({ queryKey: ['orders'] });
  // Not `keys.dashboard()` — that appends a concrete `salesUserId` (or
  // `null`), which may not be this mutation's own viewer, so a literal
  // `['dashboard']` prefix is the only way to catch every cached scope.
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  if (orderId) {
    qc.invalidateQueries({ queryKey: keys.orderTimeline(orderId) });
    // What the order may still be billed for: a delivery just made a note
    // invoiceable, an invoice just claimed one, a cancellation just released
    // one back (PRD §21's whole-DN rule).
    qc.invalidateQueries({ queryKey: keys.invoiceable(orderId) });
  }
  // The invoice register.
  qc.invalidateQueries({ queryKey: ['list', '/invoices'] });
  // `invoiceId` is opt-in for exactly the reason `paymentId` is: a mutation
  // whose own response *is* the invoice seeds `keys.invoice(id)` from it, and
  // invalidating that same line here would fire a `GET` that races the seed.
  // Callers pass it only for invoices they changed without returning — a
  // payment allocation moving `paid_amount`/`outstanding` on the invoices it
  // settles (see `payments/hooks.ts`).
  if (invoiceId) qc.invalidateQueries({ queryKey: keys.invoice(invoiceId) });
  if (customerId) {
    qc.invalidateQueries({ queryKey: keys.customerFinancialSummary(customerId) });
    // The customer detail's own key space (financial summary included, but
    // also whatever else is cached under it, e.g. a future "payments for this
    // customer" query) — a prefix match, not a replacement for the line above.
    qc.invalidateQueries({ queryKey: ['customer', customerId] });
  }
  qc.invalidateQueries({ queryKey: ['list', '/payments'] });
  qc.invalidateQueries({ queryKey: ['list', '/receivables'] });
  if (paymentId) qc.invalidateQueries({ queryKey: keys.payment(paymentId) });
}
