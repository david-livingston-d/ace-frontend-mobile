import { isOpenPhase } from '@/lib/sales/status';

export type Action = 'edit' | 'verify' | 'cancel' | 'recordDelivery' | 'createInvoice' | 'recordPayment' | 'pdf';

/**
 * Whether this order still has a *delivered* note that no live invoice claims
 * — PRD §21's whole-DN rule, decided from the order detail payload alone.
 *
 * The payload does not say which notes each invoice took (neither
 * `DeliveryNoteSummaryOut` nor `InvoiceSummaryOut` carries the link), so this
 * reads the two signals it does have:
 *
 *  - a **submitted** invoice moves each order line's `invoiced_qty`, so
 *    `invoiceable_qty` (`delivered_qty - invoiced_qty`, sales/service.py) is an
 *    exact test for everything already billed;
 *  - a **draft** invoice moves no quantity at all, and claims at least one
 *    note — so drafts are counted note-for-draft against the delivered ones.
 *
 * That is necessary, and sufficient in every case a rep meets in practice; the
 * one it can over-report is a single draft invoice holding two delivered notes.
 * The screen behind the action re-asks the server (`GET …/invoiceable`), which
 * is the authority, and shows its empty state when there is nothing left.
 */
function hasUnclaimedDeliveredNote({
  lines,
  deliveryNotes,
  invoices,
}: {
  lines: { invoiceable_qty?: string }[];
  deliveryNotes: { status: string }[];
  invoices: { status: string }[];
}): boolean {
  const delivered = deliveryNotes.filter((dn) => dn.status === 'delivered').length;
  if (delivered === 0) return false;
  if (!lines.some((l) => Number(l.invoiceable_qty ?? '0') > 0)) return false;
  const drafts = invoices.filter((inv) => inv.status === 'draft').length;
  return delivered > drafts;
}

/**
 * The order-detail sticky action bar's whole permission/phase matrix, kept as
 * one pure function so it's unit-testable without mounting the screen (see
 * `__tests__/actions.table.test.ts`). `lines` needs `deliverable` (a delivery
 * can only be recorded once at least one line still has something to ship) and
 * `invoiceable_qty` (see `hasUnclaimedDeliveredNote`).
 */
export function visibleActions({
  phase,
  lines,
  deliveryNotes = [],
  invoices = [],
  can,
}: {
  phase: string;
  lines: { deliverable: string; invoiceable_qty?: string }[];
  deliveryNotes?: { status: string }[];
  invoices?: { status: string }[];
  can: (code: string) => boolean;
}): Action[] {
  const out: Action[] = [];
  if (phase === 'draft') {
    if (can('sales_order.update')) out.push('edit');
    if (can('sales_order.verify')) out.push('verify');
    if (can('sales_order.cancel')) out.push('cancel');
  } else if (isOpenPhase(phase)) {
    if (can('delivery_note.create') && lines.some((l) => Number(l.deliverable) > 0)) out.push('recordDelivery');
    // Both codes, not just `invoice.create`: the screen behind this button
    // opens on `GET …/invoiceable`, which the API guards with `invoice.read`,
    // so a create-without-read grant would land the rep on a 403 error state.
    if (
      can('invoice.create') &&
      can('invoice.read') &&
      hasUnclaimedDeliveredNote({ lines, deliveryNotes, invoices })
    ) {
      out.push('createInvoice');
    }
    if (can('payment.create')) out.push('recordPayment');
  }
  if (can('sales_order.read')) out.push('pdf');
  return out;
}
