import { customerSchema, toCustomerIn, type CustomerForm } from '../schema';

const valid = {
  name: 'Urban Threads Retail',
  customer_type_id: 'ct1',
  mobile: '9840122110',
  email: '',
  gstin: '',
  line1: '12 Anna Salai',
  line2: '',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600002',
  payment_terms_id: '',
  notes: '',
};

test('rejects an empty name', () => {
  const result = customerSchema.safeParse({ ...valid, name: '' });
  expect(result.success).toBe(false);
});

test('rejects a missing customer type', () => {
  const result = customerSchema.safeParse({ ...valid, customer_type_id: '' });
  expect(result.success).toBe(false);
});

test('rejects a missing state', () => {
  const result = customerSchema.safeParse({ ...valid, state: '' });
  expect(result.success).toBe(false);
});

test('rejects an 11-digit phone number', () => {
  const result = customerSchema.safeParse({ ...valid, mobile: '98401221101' });
  expect(result.success).toBe(false);
});

test('accepts a 10-digit mobile with spaces stripped', () => {
  const result = customerSchema.safeParse({ ...valid, mobile: '98401 22110' });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.mobile).toBe('9840122110');
});

test('rejects a 14-character GSTIN', () => {
  const result = customerSchema.safeParse({ ...valid, gstin: '33AABCM2210P1Z' });
  expect(result.success).toBe(false);
});

test('accepts a 15-character GSTIN', () => {
  const result = customerSchema.safeParse({ ...valid, gstin: '33AABCM2210P1ZK' });
  expect(result.success).toBe(true);
});

test('email is optional', () => {
  const result = customerSchema.safeParse({ ...valid, email: '' });
  expect(result.success).toBe(true);
});

test('rejects an invalid email when one is given', () => {
  const result = customerSchema.safeParse({ ...valid, email: 'not-an-email' });
  expect(result.success).toBe(false);
});

describe('toCustomerIn', () => {
  const form: CustomerForm = {
    ...valid,
    mobile: '9840122110',
    gstin: '',
  };

  test('maps a customer form to the API create body', () => {
    const body = toCustomerIn(form);
    expect(body.name).toBe('Urban Threads Retail');
    expect(body.customer_type_id).toBe('ct1');
    expect(body.state).toBe('Tamil Nadu');
    expect(body.country).toBe('India');
    expect(body.gstin).toBeNull();
    expect(body.payment_terms_id).toBeNull();
    expect(body.contacts).toEqual([
      { name: 'Urban Threads Retail', mobile: '9840122110', email: null, is_primary: true },
    ]);
    expect(body.addresses).toEqual([
      {
        type: 'both',
        line1: '12 Anna Salai',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600002',
        country: 'India',
        is_default_billing: true,
        is_default_shipping: true,
      },
    ]);
  });

  test('keeps a GSTIN when one is present', () => {
    const body = toCustomerIn({ ...form, gstin: '33AABCM2210P1ZK' });
    expect(body.gstin).toBe('33AABCM2210P1ZK');
  });
});
