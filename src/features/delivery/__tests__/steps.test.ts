import { deliveryStep, deliveryNextAction, DELIVERY_STEPS } from '@/features/delivery/steps';

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
