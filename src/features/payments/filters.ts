// The payments register's filter state -> `/payments` query params. Mirrors
// `features/orders/filters.ts`'s shape and its "booleans only when true"
// convention, so the two registers read the same way to anyone who has
// already worked on one of them.
import { addMoney, cmpMoney } from '@/lib/sales/calc';
import type { ReceivableRow } from './types';

export type PaymentStatus = 'draft' | 'submitted' | 'cancelled';

/** `payments.status` never carries anything beyond these three (PRD §38) —
 * the same vocabulary `lib/sales/status.ts`'s `paymentDocStatusLabel` reads
 * off a single payment; this is the filter sheet's copy of the same labels. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  cancelled: 'Cancelled',
};

export type PaymentFilters = {
  q?: string;
  status?: PaymentStatus;
  paymentModeId?: string;
  paymentModeName?: string;
  dateFrom?: string;
  dateTo?: string;
  unallocatedOnly?: boolean;
};

export function paymentFiltersToParams(f: PaymentFilters): Record<string, string | boolean> {
  const p: Record<string, string | boolean> = {};
  if (f.q?.trim()) p.q = f.q.trim();
  if (f.status) p.status = f.status;
  if (f.paymentModeId) p.payment_mode_id = f.paymentModeId;
  if (f.dateFrom) p.date_from = f.dateFrom;
  if (f.dateTo) p.date_to = f.dateTo;
  // Only sent when true — same convention as `orders/filters.ts`'s
  // `openShortage`: the endpoint treats an absent flag and an explicit
  // `false` the same, so omitting it keeps the query string clean.
  if (f.unallocatedOnly) p.unallocated_only = true;
  return p;
}

export type ReceivableGroup = {
  customer_id: string;
  customer_name: string;
  /** Summed invoice `net` — what this customer has actually been billed. */
  billed: string;
  /** Summed `paid_amount` across those same invoices. */
  paid: string;
  outstanding: string;
  overdue: string;
  invoices: number;
};

/**
 * `/receivables` rows are one per open invoice; the "By customer" view wants
 * one row per customer, summed across their open invoices. Every sum runs
 * through `addMoney` (string arithmetic — never `Number(a) + Number(b)`), and
 * `billed`/`paid` are the same sums over `net`/`paid_amount` — the row's
 * metrics strip shows all three, since an outstanding figure only means
 * something beside what was billed and what has come in. `overdue` only
 * accumulates an invoice that is actually past due
 * (`days_overdue > 0`); a not-yet-due invoice still counts toward
 * `outstanding` but not `overdue`. Sorted by outstanding descending (ties
 * broken by name, so the order is stable) — the customer owing the most sits
 * at the top of the list.
 */
export function groupReceivables(items: ReceivableRow[]): ReceivableGroup[] {
  const order: string[] = [];
  const groups = new Map<string, ReceivableGroup>();
  for (const item of items) {
    let group = groups.get(item.customer_id);
    if (!group) {
      group = {
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        billed: '0.00',
        paid: '0.00',
        outstanding: '0.00',
        overdue: '0.00',
        invoices: 0,
      };
      groups.set(item.customer_id, group);
      order.push(item.customer_id);
    }
    group.billed = addMoney(group.billed, item.net);
    group.paid = addMoney(group.paid, item.paid_amount);
    group.outstanding = addMoney(group.outstanding, item.outstanding);
    if (item.days_overdue > 0) group.overdue = addMoney(group.overdue, item.outstanding);
    group.invoices += 1;
  }
  return order
    .map((id) => groups.get(id)!)
    .sort((a, b) => cmpMoney(b.outstanding, a.outstanding) || a.customer_name.localeCompare(b.customer_name));
}
