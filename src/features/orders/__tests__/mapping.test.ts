import { useOrderDraft } from '@/features/orders/store/draft';
import type { SalesOrderDetail } from '@/lib/api/types';
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

/** A saved draft order as `GET /sales-orders/{id}` returns it — one line, so
 * the assertions read as "this line" rather than "index 0 of something". */
function savedOrder(line: { rate?: string; discount_pct?: string } = {}): SalesOrderDetail {
  return {
    id: 'o1',
    number: 'SO-26-27-00030',
    customer_id: 'c1',
    customer_name: 'Arjun Mehta',
    billing_address: { id: 'a1' },
    shipping_address: { id: 'a1' },
    payment_terms_id: 'pt1',
    order_date: '2026-08-20',
    expected_delivery_date: '2026-08-28',
    remarks: null,
    order_discount_pct: '0.00',
    lines: [
      {
        variant_id: 'v1', product_id: 'p1', sku: 'WH-TEE-BLK-M', product_name: 'Tee',
        variant_label: 'Black / M', qty: '12.000', rate: '499.00', discount_pct: '0.00',
        tax_rate: '12.00', remarks: null, ...line,
      },
    ],
  } as unknown as SalesOrderDetail;
}

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

  const body = toSalesOrderIn(useOrderDraft.getState(), '2026-08-27');

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

// The payload carries what the draft holds, for everybody. A line only ever
// *has* a discount because someone with `sales_order.discount_override` typed
// one (the field is rendered nowhere else) or because the saved order already
// carried it — and zeroing that on the way out is silently changing money.
test('a discount is sent as it stands, whoever is saving', () => {
  seed();
  useOrderDraft.getState().setDiscount('v1', '10');
  useOrderDraft.getState().setOrderDiscountPct('5');

  const body = toSalesOrderIn(useOrderDraft.getState(), '2026-08-27');
  expect(body.lines[0]!.discount_pct).toBe('10');
  expect(body.order_discount_pct).toBe('5');
});

// I2: the caller's permissions are the *server's* business. A rep re-opening
// a draft a sales head discounted must not hand back `discount_pct: '0'` — the
// 10% would vanish on a save that only meant to change a quantity.
test('a hydrated line keeps its stored discount in the payload', () => {
  useOrderDraft.getState().hydrateFromOrder(savedOrder({ discount_pct: '10.00' }));
  useOrderDraft.getState().setQty('v1', 20);

  const patch = toSalesOrderPatch(useOrderDraft.getState());
  expect(patch.lines).toHaveLength(1);
  // Exactly as the order stores it — this value is not this session's doing.
  expect(patch.lines![0]!.discount_pct).toBe('10.00');
});

// I1: the stored rate may be an override someone already had the permission
// for. Sending `rate: null` would have the server re-resolve today's list
// price, so a ₹450 negotiated line silently becomes ₹499 on a qty edit.
test('a hydrated line sends its stored rate, not null', () => {
  useOrderDraft.getState().hydrateFromOrder(savedOrder({ rate: '450.00' }));
  expect(useOrderDraft.getState().lines.v1!.rateTouched).toBe(true);
  // No list price is invented for a line whose real one we never fetched.
  expect(useOrderDraft.getState().lines.v1!.snapshot.price).toBeNull();

  useOrderDraft.getState().setQty('v1', 20);
  const patch = toSalesOrderPatch(useOrderDraft.getState());
  expect(patch.lines![0]!.rate).toBe('450.00');
});

test('toSalesOrderPatch never sends order_date or customer_id and replaces every line', () => {
  seed();
  useOrderDraft.getState().setOrderDiscountPct('5');

  const patch = toSalesOrderPatch(useOrderDraft.getState());
  expect(patch).not.toHaveProperty('order_date');
  expect(patch).not.toHaveProperty('customer_id');
  // Nothing was hydrated, so "unchanged" can't be established: send the lines.
  expect(patch.lines).toHaveLength(2);
  expect(patch.order_discount_pct).toBe('5');
  expect(patch.expected_delivery_date).toBe('2026-09-01');
});

// I3: the server reads a `lines` key as "re-author every line" — it re-prices
// each one and refuses the whole replace on a discounted order without
// `sales_order.discount_override`. Editing the remarks must not ask for that.
test('the PATCH sends lines only when the lines actually changed', () => {
  useOrderDraft.getState().hydrateFromOrder(savedOrder({ rate: '450.00' }));

  useOrderDraft.getState().setHeader({ remarks: 'Deliver to the back gate' });
  const headerOnly = toSalesOrderPatch(useOrderDraft.getState());
  expect(headerOnly).not.toHaveProperty('lines');
  expect(headerOnly.remarks).toBe('Deliver to the back gate');
  expect(headerOnly.expected_delivery_date).toBe('2026-08-28');
  expect(headerOnly.payment_terms_id).toBe('pt1');
  // Fix round 2: the hydrated order carried no discount and this edit didn't
  // add one, so the field is absent — not re-sent as '0' — same treatment as
  // `lines`.
  expect(headerOnly).not.toHaveProperty('order_discount_pct');

  // Re-typing a rate at a different scale is the same rate, not an edit.
  useOrderDraft.getState().setRate('v1', '450');
  expect(toSalesOrderPatch(useOrderDraft.getState())).not.toHaveProperty('lines');

  useOrderDraft.getState().setQty('v1', 20);
  const edited = toSalesOrderPatch(useOrderDraft.getState());
  expect(edited.lines).toHaveLength(1);
  expect(edited.lines![0]).toEqual({ variant_id: 'v1', qty: '20', rate: '450.00', discount_pct: '0', remarks: null });
});

// Fix round 2: the server requires `sales_order.discount_override` whenever a
// *sent* `order_discount_pct > 0` — even when it didn't change. A rep without
// that permission editing only the remarks of a draft a sales head discounted
// at the order level must not have the field on the payload at all, or the
// honest-but-unnecessary 403 makes an unrelated edit impossible for them.
test('order_discount_pct is sent only when it differs from the hydrated value', () => {
  useOrderDraft.getState().hydrateFromOrder({ ...savedOrder(), order_discount_pct: '5.00' });
  expect(useOrderDraft.getState().orderDiscountPct).toBe('5.00');

  useOrderDraft.getState().setHeader({ remarks: 'Remarks only' });
  const unchanged = toSalesOrderPatch(useOrderDraft.getState());
  expect(unchanged).not.toHaveProperty('order_discount_pct');
  expect(unchanged.remarks).toBe('Remarks only');

  useOrderDraft.getState().setOrderDiscountPct('10');
  const changed = toSalesOrderPatch(useOrderDraft.getState());
  expect(changed.order_discount_pct).toBe('10');
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
