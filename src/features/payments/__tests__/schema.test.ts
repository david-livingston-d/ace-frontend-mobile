import { paymentSchema, toPaymentIn, type PaymentForm } from '@/features/payments/schema';
import { todayIso } from '@/lib/format/date';

const VALID: PaymentForm = {
  amount: '20000',
  payment_mode_id: 'pm1',
  payment_date: todayIso(),
  reference: '',
  remarks: '',
};

function errorFor(form: Partial<PaymentForm>, field: keyof PaymentForm): string | undefined {
  const result = paymentSchema.safeParse({ ...VALID, ...form });
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
}

test('a plain amount + mode + today is valid', () => {
  expect(paymentSchema.safeParse(VALID).success).toBe(true);
});

test('the amount must be a positive decimal string with at most 2 dp', () => {
  expect(errorFor({ amount: '' }, 'amount')).toBe('Enter an amount');
  expect(errorFor({ amount: '0' }, 'amount')).toBe('Enter an amount greater than zero');
  expect(errorFor({ amount: '0.00' }, 'amount')).toBe('Enter an amount greater than zero');
  expect(errorFor({ amount: '12.345' }, 'amount')).toBe('An amount has at most two decimal places');
  expect(errorFor({ amount: 'abc' }, 'amount')).toBe('Enter an amount');
  // The exact string is preserved — never re-rounded on the way through.
  expect(paymentSchema.parse({ ...VALID, amount: '1234.50' }).amount).toBe('1234.50');
});

test('a payment mode is required', () => {
  expect(errorFor({ payment_mode_id: '' }, 'payment_mode_id')).toBe('Pick a payment mode');
});

test('the payment date cannot be in the future', () => {
  expect(errorFor({ payment_date: '2999-01-01' }, 'payment_date')).toBe("A payment can't be dated in the future");
  expect(errorFor({ payment_date: '2020-01-01' }, 'payment_date')).toBeUndefined();
});

test('reference is capped at 100 characters and remarks at 500', () => {
  expect(errorFor({ reference: 'x'.repeat(101) }, 'reference')).toBe('Keep the reference under 100 characters');
  expect(errorFor({ remarks: 'x'.repeat(501) }, 'remarks')).toBe('Keep the remarks under 500 characters');
  expect(errorFor({ reference: 'x'.repeat(100) }, 'reference')).toBeUndefined();
});

test('toPaymentIn tags the order for "this order", and omits it for a customer advance', () => {
  const form = paymentSchema.parse({ ...VALID, reference: 'UTR-99' });
  expect(toPaymentIn(form, { customerId: 'c1', orderId: 'o1', against: 'order' })).toEqual({
    customer_id: 'c1',
    sales_order_id: 'o1',
    payment_date: form.payment_date,
    amount: '20000',
    payment_mode_id: 'pm1',
    reference: 'UTR-99',
    remarks: null,
  });
  expect(toPaymentIn(form, { customerId: 'c1', orderId: 'o1', against: 'customer' }).sales_order_id).toBeNull();
  expect(toPaymentIn(form, { customerId: 'c1', orderId: 'o1', against: 'invoice' }).sales_order_id).toBe('o1');
  expect(toPaymentIn(form, { customerId: 'c1', against: 'invoice' }).sales_order_id).toBeNull();
});
