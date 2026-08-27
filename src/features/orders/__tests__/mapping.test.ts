import { useOrderDraft } from '@/features/orders/store/draft';
import { toSalesOrderIn, toSalesOrderPatch, validateDraft } from '@/features/orders/mapping';
import type { LineSnapshot } from '@/features/products/types';

const snap = (sku: string, price: string | null, taxRate: string | null = '12'): LineSnapshot => ({
  sku,
  productId: 'p1',
  productName: 'Tee',
  variantLabel: 'Black / M',
  attributeValues: [],
  taxRate,
  price: price ? { sellingPrice: price, taxInclusive: false } : null,
  stock: null,
});

const customer = {
  id: 'c1',
  name: 'Arjun Mehta',
  code: 'CUS-0001',
  addresses: [
    {
      id: 'a1', type: 'both', line1: '1 MG Road', line2: null, city: 'Chennai', state: 'TN',
      pincode: '600001', country: 'IN', is_default_billing: true, is_default_shipping: true,
    },
  ],
  paymentTermsId: 'pt1',
};

function seed() {
  const s = useOrderDraft.getState();
  s.setCustomer(customer);
  s.addLines([
    { variantId: 'v1', qty: 12, snapshot: snap('WH-TEE-BLK-M', '499') },
    { variantId: 'v2', qty: 8, snapshot: snap('WH-TEE-BLK-L', '499') },
  ]);
  s.setHeader({ expectedDeliveryDate: '2026-09-01', remarks: '  Gate 3  ' });
}

beforeEach(() => useOrderDraft.getState().reset());

test('toSalesOrderIn sends null for untouched rates and a 2dp string for touched ones', () => {
  seed();
  useOrderDraft.getState().setRate('v2', '450');

  const body = toSalesOrderIn(useOrderDraft.getState(), '2026-08-27', true);

  expect(body.customer_id).toBe('c1');
  expect(body.order_date).toBe('2026-08-27');
  expect(body.billing_address_id).toBe('a1');
  expect(body.shipping_address_id).toBe('a1');
  expect(body.payment_terms_id).toBe('pt1');
  expect(body.expected_delivery_date).toBe('2026-09-01');
  expect(body.remarks).toBe('Gate 3');
  expect(body.lines).toHaveLength(2);
  expect(body.lines[0]).toEqual({ variant_id: 'v1', qty: '12', rate: null, discount_pct: '0', remarks: null });
  expect(body.lines[1]!.rate).toBe('450.00');
});

test('discount_pct is forced to 0 without sales_order.discount_override', () => {
  seed();
  useOrderDraft.getState().setDiscount('v1', '10');
  useOrderDraft.getState().setOrderDiscountPct('5');

  const allowed = toSalesOrderIn(useOrderDraft.getState(), '2026-08-27', true);
  expect(allowed.lines[0]!.discount_pct).toBe('10');
  expect(allowed.order_discount_pct).toBe('5');

  const denied = toSalesOrderIn(useOrderDraft.getState(), '2026-08-27', false);
  expect(denied.lines[0]!.discount_pct).toBe('0');
  expect(denied.order_discount_pct).toBe('0');
});

test('toSalesOrderPatch never sends order_date or customer_id and replaces every line', () => {
  seed();
  useOrderDraft.getState().setOrderDiscountPct('5');

  const patch = toSalesOrderPatch(useOrderDraft.getState(), true);
  expect(patch).not.toHaveProperty('order_date');
  expect(patch).not.toHaveProperty('customer_id');
  expect(patch.lines).toHaveLength(2);
  expect(patch.order_discount_pct).toBe('5');
  expect(patch.expected_delivery_date).toBe('2026-09-01');

  // Without the override permission the stored discount is left alone rather
  // than silently zeroed by an edit that never touched it.
  const denied = toSalesOrderPatch(useOrderDraft.getState(), false);
  expect(denied).not.toHaveProperty('order_discount_pct');
});

test('validateDraft mirrors the web rules', () => {
  expect(validateDraft(useOrderDraft.getState()).customer).toContain('Pick a customer');

  seed();
  expect(validateDraft(useOrderDraft.getState())).toEqual({});

  useOrderDraft.getState().setQty('v1', 12);
  useOrderDraft.getState().addLines([{ variantId: 'v3', qty: 3, snapshot: snap('WH-TEE-NOPRICE', null) }]);
  expect(validateDraft(useOrderDraft.getState()).lines?.v3).toContain('Enter a rate');

  useOrderDraft.getState().setRate('v3', '250');
  expect(validateDraft(useOrderDraft.getState()).lines?.v3).toBeUndefined();

  useOrderDraft.getState().addLines([{ variantId: 'v4', qty: 1, snapshot: snap('WH-TEE-NOTAX', '499', null) }]);
  expect(validateDraft(useOrderDraft.getState()).lines?.v4).toContain("This SKU's HSN has no active GST rate");

  useOrderDraft.getState().remove('v4');
  useOrderDraft.getState().setDiscount('v1', '120');
  expect(validateDraft(useOrderDraft.getState()).lines?.v1).toContain('between 0 and 100');

  useOrderDraft.getState().reset();
  useOrderDraft.getState().setCustomer(customer);
  expect(validateDraft(useOrderDraft.getState()).header).toContain('at least one line');
});

// A rep without `sales_order.rate_override` has no rate field at all, so
// "Enter a rate" is an instruction they cannot follow. The only two things
// they *can* do are drop the line or get a price set, and the message has to
// say so or the cart is a dead end (found on device: TSH-BLUE-S has no active
// price, and the Sales Executive's Review button stayed disabled with no
// visible way forward).
test('a no-price line tells a rep who cannot override the rate what to do instead', () => {
  seed();
  useOrderDraft.getState().addLines([{ variantId: 'v3', qty: 3, snapshot: snap('WH-TEE-NOPRICE', null) }]);

  expect(validateDraft(useOrderDraft.getState()).lines?.v3).toContain('Enter a rate');
  expect(validateDraft(useOrderDraft.getState(), { canOverrideRate: true }).lines?.v3).toContain('Enter a rate');

  const denied = validateDraft(useOrderDraft.getState(), { canOverrideRate: false }).lines?.v3;
  expect(denied).toContain('no active price');
  expect(denied).toContain('Remove this line');
  expect(denied).not.toContain('Enter a rate');

  // A priced line the user simply blanked still reads as "type a rate" — that
  // one they can only reach with the permission anyway.
  useOrderDraft.getState().setRate('v1', '');
  expect(validateDraft(useOrderDraft.getState(), { canOverrideRate: false }).lines?.v1).toContain('Enter a rate');
});
