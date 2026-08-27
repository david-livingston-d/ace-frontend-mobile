import { PAYMENT_ERRORS, SHORTAGE_ERRORS } from '../errors';

describe('PAYMENT_ERRORS', () => {
  test('carries the dynamic payment/allocation codes (S6/M3)', () => {
    for (const code of [
      'over_allocated',
      'invoice_over_allocated',
      'invoice_not_submitted',
      'customer_mismatch',
      'order_closed',
    ]) {
      expect(typeof PAYMENT_ERRORS[code]).toBe('string');
      expect(PAYMENT_ERRORS[code]!.length).toBeGreaterThan(0);
    }
  });
});

describe('SHORTAGE_ERRORS', () => {
  test('is exported with the shortage-specific duplicate_line copy', () => {
    expect(SHORTAGE_ERRORS.duplicate_line).toBe('This order line appears twice in the batch.');
  });
});
