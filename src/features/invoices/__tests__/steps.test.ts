import { INVOICE_STEPS, invoiceStep, invoiceNextAction } from '@/features/invoices/steps';

const held = (...codes: string[]) => (code: string) => codes.includes(code);
const none = () => false;

test('INVOICE_STEPS is the two-step Created/Submitted track', () => {
  expect(INVOICE_STEPS).toEqual(['Created', 'Submitted']);
});

test('draft -> submitted map to steps 0 and 1, never failed', () => {
  expect(invoiceStep('draft')).toEqual({ current: 0, label: 'Created', failed: false });
  expect(invoiceStep('submitted')).toEqual({ current: 1, label: 'Submitted', failed: false });
});

test('cancelled always fails, at step 0', () => {
  expect(invoiceStep('cancelled')).toEqual({ current: 0, label: 'Cancelled', failed: true });
});

test('an unrecognised status falls back to step 0, not failed', () => {
  expect(invoiceStep('some_future_status')).toEqual({ current: 0, label: 'some_future_status', failed: false });
});

test('a draft invoice next-steps to Submit, gated by invoice.submit', () => {
  expect(invoiceNextAction({ status: 'draft' }, held('invoice.submit'))).toEqual({
    label: 'Submit',
    permission: 'invoice.submit',
    enabled: true,
  });
});

test('the step is still named when the viewer cannot drive it — only `enabled` changes', () => {
  // The step bar greys CONTINUE out with a hint rather than hiding it, so the
  // action has to survive the permission check (same contract as the DN/payment
  // step bars).
  expect(invoiceNextAction({ status: 'draft' }, none)).toEqual({
    label: 'Submit',
    permission: 'invoice.submit',
    enabled: false,
  });
});

test('a submitted invoice has no next step — paying it is a different document', () => {
  expect(invoiceNextAction({ status: 'submitted' }, held('invoice.submit', 'payment.create'))).toBeNull();
});

test('a cancelled invoice has no next step', () => {
  expect(invoiceNextAction({ status: 'cancelled' }, held('invoice.submit'))).toBeNull();
});

test('role names buy nothing — only the permission code enables the step', () => {
  expect(invoiceNextAction({ status: 'draft' }, held('Sales Head', 'Admin'))?.enabled).toBe(false);
});
