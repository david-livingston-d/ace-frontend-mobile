import { initAllocations, setRowAmount, totals, type AllocationRowState } from '@/features/payments/allocation';
import { PAYMENT_STEPS, paymentStep, paymentNextAction } from '@/features/payments/steps';
import { paymentDetail } from '@/test/fixtures';
import type { Schemas } from '@/lib/api/types';

const suggested = (over: Partial<Schemas['SuggestedAllocationOut']> = {}): Schemas['SuggestedAllocationOut'] => ({
  invoice_id: 'i1',
  invoice_number: 'INV-26-27-000003',
  so_id: 'o1',
  so_number: 'POS-26-27-000041',
  due_date: '2026-09-10',
  net: '11200.00',
  outstanding: '11200.00',
  amount: '11200.00',
  ...over,
});

const TWO = [
  suggested(),
  suggested({ invoice_id: 'i2', invoice_number: 'INV-26-27-000004', outstanding: '9000.00', net: '9000.00', amount: '8800.00', due_date: '2026-09-20' }),
];

test('initAllocations seeds one row per suggested invoice, keeping the server amounts', () => {
  const rows = initAllocations(TWO, '20000.00');
  expect(rows).toEqual([
    { invoice_id: 'i1', invoice_number: 'INV-26-27-000003', so_id: 'o1', so_number: 'POS-26-27-000041', due_date: '2026-09-10', outstanding: '11200.00', amount: '11200.00' },
    { invoice_id: 'i2', invoice_number: 'INV-26-27-000004', so_id: 'o1', so_number: 'POS-26-27-000041', due_date: '2026-09-20', outstanding: '9000.00', amount: '8800.00' },
  ]);
});

test('initAllocations never seeds more than the payment is worth', () => {
  // A stale suggestion (the payment shrank since) must not seed an
  // over-allocated form the server would only reject.
  const rows = initAllocations(TWO, '15000.00');
  expect(rows.map((r) => r.amount)).toEqual(['11200.00', '3800.00']);
  expect(totals(rows, '15000.00').overAllocated).toBe(false);
});

test('setRowAmount replaces one row only and leaves the rest alone', () => {
  const rows = setRowAmount(initAllocations(TWO, '20000.00'), 'i2', '500');
  expect(rows.map((r) => r.amount)).toEqual(['11200.00', '500']);
  expect(setRowAmount(rows, 'nope', '1')).toEqual(rows);
});

test('totals adds the rows exactly and reports what is left', () => {
  const rows = initAllocations(TWO, '20000.00');
  expect(totals(rows, '20000.00')).toEqual({
    allocated: '20000.00',
    unallocated: '0.00',
    overAllocated: false,
    rowErrors: {},
  });
  expect(totals(setRowAmount(rows, 'i2', '0'), '20000.00')).toMatchObject({
    allocated: '11200.00',
    unallocated: '8800.00',
    overAllocated: false,
  });
});

test('a row over its own outstanding reports a row error but is still counted', () => {
  const rows = setRowAmount(initAllocations(TWO, '20000.00'), 'i2', '9000.01');
  const t = totals(rows, '20000.00');
  expect(t.rowErrors).toEqual({ i2: 'Only ₹9,000.00 is outstanding on this invoice' });
  expect(t.allocated).toBe('20200.01');
});

test('over-allocating the payment is reported, not silently clamped', () => {
  const rows = setRowAmount(initAllocations(TWO, '20000.00'), 'i1', '30000');
  const t = totals(rows, '20000.00');
  expect(t.overAllocated).toBe(true);
  expect(t.unallocated).toBe('-18800.00');
});

test('a half-typed row amount reads as zero rather than breaking the totals', () => {
  const rows = setRowAmount(initAllocations(TWO, '20000.00'), 'i1', '');
  expect(totals(rows, '20000.00').allocated).toBe('8800.00');
});

test('PAYMENT_STEPS is the three-step Recorded/Submitted/Allocated track', () => {
  expect(PAYMENT_STEPS).toEqual(['Recorded', 'Submitted', 'Allocated']);
});

test('paymentStep reads the payment status the server actually reports', () => {
  expect(paymentStep(paymentDetail({ status: 'draft' }))).toEqual({ current: 0, failed: false });
  // Submitted and untouched = an advance sitting on the customer's account.
  expect(paymentStep(paymentDetail({ status: 'submitted', amount: '5000.00', allocated: '0.00', unallocated: '5000.00' })))
    .toEqual({ current: 1, failed: false });
  expect(
    paymentStep(
      paymentDetail({
        status: 'submitted',
        amount: '5000.00',
        allocated: '5000.00',
        unallocated: '0.00',
        allocations: [
          {
            id: 'a1', invoice_id: 'i1', invoice_number: 'INV-1', invoice_date: '2026-08-20', due_date: '2026-09-20',
            so_id: 'o1', so_number: 'POS-1', net: '5000.00', paid_amount: '5000.00', outstanding: '0.00', amount: '5000.00',
          },
        ],
      }),
    ),
  ).toEqual({ current: 2, failed: false });
  expect(paymentStep(paymentDetail({ status: 'cancelled' }))).toEqual({ current: 0, failed: true });
});

test('paymentNextAction names the next step and the permission it needs', () => {
  expect(paymentNextAction(paymentDetail({ status: 'draft' }))).toEqual({ label: 'Submit', permission: 'payment.submit' });
  expect(paymentNextAction(paymentDetail({ status: 'submitted', amount: '5000.00', unallocated: '5000.00' })))
    .toEqual({ label: 'Allocate', permission: 'payment.allocate' });
  // Nothing left to allocate, and a cancelled payment has no next step at all.
  expect(paymentNextAction(paymentDetail({ status: 'submitted', amount: '5000.00', allocated: '5000.00', unallocated: '0.00' }))).toBeNull();
  expect(paymentNextAction(paymentDetail({ status: 'cancelled' }))).toBeNull();
});

test('AllocationRowState is the shape the screen renders', () => {
  const row: AllocationRowState = initAllocations(TWO, '20000.00')[0]!;
  expect(row.invoice_number).toBe('INV-26-27-000003');
});
