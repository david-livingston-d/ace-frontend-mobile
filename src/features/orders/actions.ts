import { isOpenPhase } from '@/lib/sales/status';

export type Action = 'edit' | 'verify' | 'cancel' | 'recordDelivery' | 'recordPayment' | 'pdf';

/**
 * The order-detail sticky action bar's whole permission/phase matrix, kept as
 * one pure function so it's unit-testable without mounting the screen (see
 * `__tests__/actions.test.ts`). `lines` only needs `deliverable` — a delivery
 * can only be recorded once at least one line still has something to ship.
 */
export function visibleActions({
  phase,
  lines,
  can,
}: {
  phase: string;
  lines: { deliverable: string }[];
  can: (code: string) => boolean;
}): Action[] {
  const out: Action[] = [];
  if (phase === 'draft') {
    if (can('sales_order.update')) out.push('edit');
    if (can('sales_order.verify')) out.push('verify');
    if (can('sales_order.cancel')) out.push('cancel');
  } else if (isOpenPhase(phase)) {
    if (can('delivery_note.create') && lines.some((l) => Number(l.deliverable) > 0)) out.push('recordDelivery');
    if (can('payment.create')) out.push('recordPayment');
  }
  if (can('sales_order.read')) out.push('pdf');
  return out;
}
