import {
  deliveryStep,
  deliveryNextAction,
  deliveryInvoiceAction,
  DELIVERY_STEPS,
} from '@/features/delivery/steps';

test('DELIVERY_STEPS is the three-step Created/Submitted/Delivered track', () => {
  expect(DELIVERY_STEPS).toEqual(['Created', 'Submitted', 'Delivered']);
});

test('draft -> submitted -> delivered map to steps 0, 1, 2, never failed', () => {
  expect(deliveryStep('draft')).toEqual({ current: 0, label: 'Created', failed: false });
  expect(deliveryStep('submitted')).toEqual({ current: 1, label: 'Submitted', failed: false });
  expect(deliveryStep('delivered')).toEqual({ current: 2, label: 'Delivered', failed: false });
});

test('cancelled always fails, at step 0', () => {
  expect(deliveryStep('cancelled')).toEqual({ current: 0, label: 'Cancelled', failed: true });
});

test('an unrecognised status falls back to step 0, not failed', () => {
  expect(deliveryStep('some_future_status')).toEqual({ current: 0, label: 'some_future_status', failed: false });
});

test('deliveryNextAction names the next step and the permission it needs', () => {
  expect(deliveryNextAction('draft')).toEqual({ label: 'Submit', permission: 'delivery_note.submit' });
  expect(deliveryNextAction('submitted')).toEqual({ label: 'Mark delivered', permission: 'delivery_note.mark_delivered' });
});

test('delivered and cancelled have no next action', () => {
  expect(deliveryNextAction('delivered')).toBeNull();
  expect(deliveryNextAction('cancelled')).toBeNull();
});

// The note's *next document* (PRD §21, whole-DN invoicing), not its next
// status — offered only once it is delivered and no live invoice holds it.
test('a delivered, unclaimed note offers Create invoice — and needs both invoice codes', () => {
  // Both codes: the create screen opens on `GET …/invoiceable`, which the API
  // guards with `invoice.read`, so `invoice.create` alone would only ever
  // reach a 403.
  expect(deliveryInvoiceAction({ status: 'delivered' })).toEqual({
    label: 'Create invoice',
    permissions: ['invoice.create', 'invoice.read'],
  });
  expect(deliveryInvoiceAction({ status: 'delivered', invoice: null })).toBeTruthy();
});

test('a note that is not yet delivered has nothing to invoice', () => {
  expect(deliveryInvoiceAction({ status: 'draft' })).toBeNull();
  expect(deliveryInvoiceAction({ status: 'submitted' })).toBeNull();
  expect(deliveryInvoiceAction({ status: 'cancelled' })).toBeNull();
});

test('a live invoice claims the note; a cancelled one releases it again', () => {
  expect(deliveryInvoiceAction({ status: 'delivered', invoice: { status: 'draft' } })).toBeNull();
  expect(deliveryInvoiceAction({ status: 'delivered', invoice: { status: 'submitted' } })).toBeNull();
  expect(deliveryInvoiceAction({ status: 'delivered', invoice: { status: 'cancelled' } })).toBeTruthy();
});
