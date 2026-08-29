import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { invalidateMoneySideEffects } from '@/lib/query/invalidate';
import { invoicesApi } from './api';
import type { InvoiceDetail, InvoiceIn } from './types';

/**
 * One invoice's detail. `enabled` is the caller's because two screens only
 * need it conditionally — the allocation screen in the *miss* case (when the
 * FIFO suggestion left out the invoice the rep tapped "Pay" on and its real
 * `outstanding` has to come from somewhere), and the create screen only when
 * it is resuming a draft rather than building a new invoice.
 */
export function useInvoice(id: string, enabled = true) {
  return useQuery({ queryKey: keys.invoice(id), queryFn: () => invoicesApi.get(id), enabled: enabled && !!id });
}

/**
 * What this order may still be billed for. `staleTime: 0`: it is a snapshot of
 * which notes are unclaimed *now*, and a cached one would offer a note someone
 * else has since invoiced — the server refuses that (`dn_not_eligible`), but
 * only after the rep has picked it.
 */
export function useInvoiceable(soId: string, enabled = true) {
  return useQuery({
    queryKey: keys.invoiceable(soId),
    queryFn: () => invoicesApi.invoiceable(soId),
    enabled: enabled && !!soId,
    staleTime: 0,
  });
}

/**
 * Every invoice mutation's response is the whole `InvoiceDetailOut`, so it
 * seeds its own detail cache and reshapes what the money touched elsewhere:
 * the order behind it (its `invoice_status`, `summary.invoiced_value` and its
 * `invoices` list), its customer's financial summary, the registers, and —
 * via `invalidateMoneySideEffects` — the order's own `invoiceable` list, which
 * this mutation has just changed by claiming or releasing a note.
 *
 * `invoiceId` is deliberately *not* passed to `invalidateMoneySideEffects`:
 * this response **is** the invoice, so it seeds `keys.invoice(id)` directly.
 * Invalidating that same line would fire a `GET` racing the seed, and the
 * detail screen would flicker back to the status it had a moment ago.
 */
function afterInvoiceMutation(qc: QueryClient, invoice: InvoiceDetail) {
  qc.setQueryData<InvoiceDetail>(keys.invoice(invoice.id), invoice);
  // The invoice response doesn't carry the order, so the order detail behind
  // it has to be invalidated explicitly (same as `afterDeliveryMutation`).
  qc.invalidateQueries({ queryKey: keys.order(invoice.so_id) });
  invalidateMoneySideEffects(qc, { orderId: invoice.so_id, customerId: invoice.customer_id });
  // Every note this invoice claims or releases has its own detail page, whose
  // "Invoice"/"Not invoiced yet" block just changed.
  for (const note of invoice.delivery_notes) {
    qc.invalidateQueries({ queryKey: keys.deliveryNote(note.dn_id) });
  }
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ soId, body }: { soId: string; body: InvoiceIn }) => invoicesApi.create(soId, body),
    onSuccess: (invoice) => afterInvoiceMutation(qc, invoice),
  });
}

export function useSubmitInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.submit(id),
    onSuccess: (invoice) => afterInvoiceMutation(qc, invoice),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => invoicesApi.cancel(id, reason),
    onSuccess: (invoice) => afterInvoiceMutation(qc, invoice),
  });
}
