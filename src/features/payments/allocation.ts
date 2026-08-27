import { addMoney, cmpMoney, subMoney } from '@/lib/sales/calc';
import { formatMoney } from '@/lib/format/money';
import type { AllocationsIn, SuggestedAllocation } from './types';

/** One editable allocation row: an invoice, what is still owed on it, and how
 * much of *this* payment the rep is putting against it. Every money field is
 * a decimal string, including `amount` — which is whatever the `MoneyInput`
 * currently holds, so it may legitimately be `''` or `'12.'` mid-typing. */
export type AllocationRowState = {
  invoice_id: string;
  invoice_number: string | null;
  so_id: string;
  so_number: string;
  due_date: string;
  outstanding: string;
  amount: string;
};

export type AllocationTotals = {
  allocated: string;
  unallocated: string;
  overAllocated: boolean;
  rowErrors: Record<string, string>;
};

/** An invoice the rep explicitly came to pay, in the shape a row needs. The
 * server's FIFO suggestion drops any invoice it would fill with zero
 * (`payments.service.suggest_allocation` skips `amount <= 0`), so the one
 * invoice the rep tapped "Pay" on can legitimately be missing from it — this
 * is how it gets a row anyway. */
export type EnsureInvoice = Pick<
  AllocationRowState,
  'invoice_id' | 'invoice_number' | 'so_id' | 'so_number' | 'due_date' | 'outstanding'
>;

/**
 * Seeds the editable rows from `GET /suggest-allocation` (the server's FIFO
 * proposal, which already folds in whatever this payment has *already* been
 * allocated to — see `payments.service.suggest_allocation`).
 *
 * The suggestion is trusted for ordering and amounts, but not blindly for the
 * total: `amount` caps the running sum, so a suggestion computed against a
 * payment that has since changed can never seed a form the server would only
 * reject as `over_allocated`. In the normal case nothing is clamped.
 *
 * `ensureInvoice` appends a zero row for an invoice the suggestion left out
 * (see `EnsureInvoice`) — appended last, and at zero, so it changes nothing
 * about what FIFO proposed: it only gives the rep somewhere to type. It is a
 * no-op when the suggestion already covers that invoice.
 */
export function initAllocations(
  suggested: SuggestedAllocation[],
  amount: string,
  options: { ensureInvoice?: EnsureInvoice } = {},
): AllocationRowState[] {
  const rows: AllocationRowState[] = [];
  let remaining = amount;
  for (const row of suggested) {
    const capped = cmpMoney(row.amount, remaining) > 0 ? remaining : row.amount;
    rows.push({
      invoice_id: row.invoice_id,
      invoice_number: row.invoice_number,
      so_id: row.so_id,
      so_number: row.so_number,
      due_date: row.due_date,
      outstanding: row.outstanding,
      amount: capped,
    });
    remaining = subMoney(remaining, capped);
  }
  const ensure = options.ensureInvoice;
  if (ensure && !rows.some((row) => row.invoice_id === ensure.invoice_id)) {
    rows.push({ ...ensure, amount: '0.00' });
  }
  return rows;
}

/** One row's amount, exactly as typed. Deliberately never clamps — an amount
 * that is too large is reported by `totals` (and, ultimately, by the server),
 * because silently rewriting money the user just typed is the one thing a
 * payment screen must not do. */
export function setRowAmount(rows: AllocationRowState[], invoiceId: string, value: string): AllocationRowState[] {
  if (!rows.some((row) => row.invoice_id === invoiceId)) return rows;
  return rows.map((row) => (row.invoice_id === invoiceId ? { ...row, amount: value } : row));
}

/**
 * The footer's running figures, in exact string money. `unallocated` goes
 * negative when the rows overdraw the payment — which is precisely what
 * `overAllocated` reports and what the SAVE button is disabled on, so the
 * over-allocation is impossible to send rather than being bounced back as a
 * 422 after the fact.
 *
 * A row above its own invoice's outstanding balance is a *row* error, not an
 * over-allocation: the payment could still afford it, the invoice just can't
 * absorb it (the server's `invoice_over_allocated`).
 */
export function totals(rows: AllocationRowState[], amount: string): AllocationTotals {
  let allocated = '0.00';
  const rowErrors: Record<string, string> = {};
  for (const row of rows) {
    allocated = addMoney(allocated, row.amount);
    if (cmpMoney(row.amount, '0') < 0) {
      // Defensive: `MoneyInput` has no way to produce a minus sign today, but
      // a negative row would quietly *raise* everything else's ceiling, and
      // the server rejects it (`invalid_amount`) rather than crediting it.
      rowErrors[row.invoice_id] = 'Enter an amount greater than zero';
    } else if (cmpMoney(row.amount, row.outstanding) > 0) {
      rowErrors[row.invoice_id] = `Only ${formatMoney(row.outstanding)} is outstanding on this invoice`;
    }
  }
  return {
    allocated,
    unallocated: subMoney(amount, allocated),
    overAllocated: cmpMoney(allocated, amount) > 0,
    rowErrors,
  };
}

/** The `PUT /payments/{id}/allocations` body — a full replace of what this
 * payment settles, so a row zeroed (or emptied) out is simply absent, which
 * is how an allocation is removed. The server rejects a zero amount outright
 * (`invalid_amount`), so sending one would be a guaranteed 422. */
export function toAllocationsIn(rows: AllocationRowState[]): AllocationsIn {
  return {
    allocations: rows
      .filter((row) => cmpMoney(row.amount, '0') > 0)
      .map((row) => ({ invoice_id: row.invoice_id, amount: row.amount })),
  };
}
