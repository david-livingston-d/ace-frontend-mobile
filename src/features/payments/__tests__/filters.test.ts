import { paymentFiltersToParams, groupReceivables, PAYMENT_STATUS_LABELS, type PaymentFilters } from '@/features/payments/filters';
import type { ReceivableRow } from '@/features/payments/types';

test('booleans and optional fields are only sent when set/true', () => {
  const full: PaymentFilters = {
    q: 'arjun',
    status: 'submitted',
    paymentModeId: 'pm1',
    paymentModeName: 'UPI',
    dateFrom: '2026-08-01',
    dateTo: '2026-08-12',
    unallocatedOnly: true,
  };
  expect(paymentFiltersToParams(full)).toEqual({
    q: 'arjun',
    status: 'submitted',
    payment_mode_id: 'pm1',
    date_from: '2026-08-01',
    date_to: '2026-08-12',
    unallocated_only: true,
  });

  expect(paymentFiltersToParams({})).toEqual({});
  // `unallocatedOnly: false` is the same as unset — never sent as an
  // explicit `false` (the register endpoint treats an absent flag and a
  // false one identically, so this keeps the query string clean).
  expect(paymentFiltersToParams({ unallocatedOnly: false })).toEqual({});
  // Blank/whitespace-only search text is dropped, same as `orders/filters.ts`.
  expect(paymentFiltersToParams({ q: '   ' })).toEqual({});
});

test('PAYMENT_STATUS_LABELS covers exactly draft/submitted/cancelled', () => {
  expect(Object.keys(PAYMENT_STATUS_LABELS).sort()).toEqual(['cancelled', 'draft', 'submitted']);
});

function row(over: Partial<ReceivableRow>): ReceivableRow {
  return {
    invoice_id: 'i1',
    number: 'INV-1',
    customer_id: 'c1',
    customer_name: 'Arjun Mehta',
    so_id: 'o1',
    so_number: 'POS-1',
    invoice_date: '2026-08-01',
    due_date: '2026-08-10',
    net: '1000.00',
    paid_amount: '0.00',
    outstanding: '1000.00',
    days_overdue: 0,
    ...over,
  };
}

test('groupReceivables sums two invoices of the same customer into one row, string-exact', () => {
  const groups = groupReceivables([
    row({ invoice_id: 'i1', customer_id: 'c1', customer_name: 'Arjun Mehta', outstanding: '1000.00', days_overdue: 0 }),
    row({ invoice_id: 'i2', customer_id: 'c1', customer_name: 'Arjun Mehta', outstanding: '250.50', days_overdue: 5 }),
  ]);
  expect(groups).toEqual([
    { customer_id: 'c1', customer_name: 'Arjun Mehta', outstanding: '1250.50', overdue: '250.50', invoices: 2 },
  ]);
});

test('groupReceivables keeps distinct customers as separate rows, sorted by outstanding desc', () => {
  const groups = groupReceivables([
    row({ invoice_id: 'i1', customer_id: 'c1', customer_name: 'Low Co', outstanding: '100.00' }),
    row({ invoice_id: 'i2', customer_id: 'c2', customer_name: 'High Co', outstanding: '9000.00' }),
  ]);
  expect(groups.map((g) => g.customer_id)).toEqual(['c2', 'c1']);
});

test('groupReceivables: an invoice not yet overdue counts toward outstanding but not overdue', () => {
  const groups = groupReceivables([row({ outstanding: '500.00', days_overdue: 0 })]);
  expect(groups[0]).toMatchObject({ outstanding: '500.00', overdue: '0.00' });
});

test('groupReceivables of an empty list is an empty list', () => {
  expect(groupReceivables([])).toEqual([]);
});
