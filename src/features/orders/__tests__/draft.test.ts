import { useOrderDraft, selectTotals, selectLineCount, selectUnitCount, draftLineSignature, draftLines } from '@/features/orders/store/draft';
import type { LineSnapshot } from '@/features/products/types';
import type { SalesOrderDetail } from '@/lib/api/types';

// The brief's own fixture, verbatim: 12 + 8 units of a 499.00 tax-exclusive
// SKU at 12% GST -> gross 9980.00, tax 1197.60, net 11177.60. `computeDocument`
// returns *numbers* (paise arithmetic divided back down — see
// `src/lib/sales/calc.ts`), not the 2dp strings the brief's sketch wrote, so the
// same figures are asserted numerically here.
const snap = (sku: string, price: string, taxRate: string | null = '12'): LineSnapshot => ({
  sku,
  productId: 'p1',
  productName: 'Tee',
  variantLabel: 'Black / M',
  attributeValues: [],
  taxRate,
  price: price ? { sellingPrice: price, taxInclusive: false } : null,
  stock: null,
});

const address = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  type: 'both',
  line1: '1 MG Road',
  line2: null,
  city: 'Chennai',
  state: 'TN',
  pincode: '600001',
  country: 'IN',
  is_default_billing: false,
  is_default_shipping: false,
  ...over,
});

beforeEach(() => useOrderDraft.getState().reset());

test('addLines merges by variant and totals follow computeDocument', () => {
  const s = useOrderDraft.getState();
  s.addLines([
    { variantId: 'v1', qty: 10, snapshot: snap('WH-TEE-BLK-M', '499') },
    { variantId: 'v2', qty: 8, snapshot: snap('WH-TEE-BLK-L', '499') },
  ]);
  s.addLines([{ variantId: 'v1', qty: 12, snapshot: snap('WH-TEE-BLK-M', '499') }]);

  expect(Object.keys(useOrderDraft.getState().lines)).toEqual(['v1', 'v2']);
  expect(useOrderDraft.getState().lines.v1!.qty).toBe(12);

  const t = selectTotals(useOrderDraft.getState());
  expect(t.gross).toBeCloseTo(9980);
  expect(t.tax).toBeCloseTo(1197.6);
  expect(t.net).toBeCloseTo(11177.6);
  expect(selectLineCount(useOrderDraft.getState())).toBe(2);
  expect(selectUnitCount(useOrderDraft.getState())).toBe(20);
});

test('setQty(0) removes the line and rate edits mark it touched', () => {
  const s = useOrderDraft.getState();
  s.addLines([
    { variantId: 'v1', qty: 10, snapshot: snap('WH-TEE-BLK-M', '499') },
    { variantId: 'v2', qty: 8, snapshot: snap('WH-TEE-BLK-L', '499') },
  ]);

  expect(useOrderDraft.getState().lines.v1!.rate).toBe('499.00');
  expect(useOrderDraft.getState().lines.v1!.rateTouched).toBe(false);

  useOrderDraft.getState().setRate('v1', '450');
  expect(useOrderDraft.getState().lines.v1!.rate).toBe('450');
  expect(useOrderDraft.getState().lines.v1!.rateTouched).toBe(true);

  // Re-adding a touched line keeps the manual rate but takes the new qty.
  useOrderDraft.getState().addLines([{ variantId: 'v1', qty: 4, snapshot: snap('WH-TEE-BLK-M', '499') }]);
  expect(useOrderDraft.getState().lines.v1!.rate).toBe('450');
  expect(useOrderDraft.getState().lines.v1!.qty).toBe(4);

  useOrderDraft.getState().setQty('v2', 0);
  expect(Object.keys(useOrderDraft.getState().lines)).toEqual(['v1']);
});

test('setCustomer seeds addresses and payment terms, and keeps them on a re-set of the same customer', () => {
  const customer = {
    id: 'c1',
    name: 'Arjun Mehta',
    code: 'CUS-0001',
    addresses: [address('a1'), address('a2', { is_default_shipping: true })],
    paymentTermsId: 'pt1',
  };
  useOrderDraft.getState().setCustomer(customer);

  expect(useOrderDraft.getState().billingAddressId).toBe('a1');
  expect(useOrderDraft.getState().shippingAddressId).toBe('a2');
  expect(useOrderDraft.getState().paymentTermsId).toBe('pt1');

  useOrderDraft.getState().setHeader({ shippingAddressId: 'a1', remarks: 'Gate 3' });
  useOrderDraft.getState().setCustomer({ ...customer });
  expect(useOrderDraft.getState().shippingAddressId).toBe('a1');
  expect(useOrderDraft.getState().remarks).toBe('Gate 3');

  // A *different* customer re-seeds from their own defaults.
  useOrderDraft.getState().setCustomer({ ...customer, id: 'c2', addresses: [address('b9')], paymentTermsId: null });
  expect(useOrderDraft.getState().billingAddressId).toBe('b9');
  expect(useOrderDraft.getState().shippingAddressId).toBe('b9');
  expect(useOrderDraft.getState().paymentTermsId).toBeNull();
});

test('hydrateFromOrder rebuilds the draft from a saved order and survives a persisted round trip', async () => {
  const order = {
    id: 'o1',
    number: 'POS-26-27-000043',
    customer_id: 'c1',
    customer_name: 'Arjun Mehta',
    billing_address: { id: 'a1' },
    shipping_address: { id: 'a2' },
    payment_terms_id: 'pt1',
    order_date: '2026-08-20',
    expected_delivery_date: '2026-08-28',
    remarks: 'Rush',
    order_discount_pct: '5',
    lines: [
      {
        variant_id: 'v1', product_id: 'p1', sku: 'WH-TEE-BLK-M', product_name: 'Tee',
        variant_label: 'Black / M', qty: '12.000', rate: '499.00', discount_pct: '0.00', tax_rate: '12.00',
        remarks: null,
      },
    ],
  } as unknown as SalesOrderDetail;

  useOrderDraft.getState().hydrateFromOrder(order);
  const state = useOrderDraft.getState();
  expect(state.editOrderId).toBe('o1');
  expect(state.customer?.id).toBe('c1');
  expect(state.billingAddressId).toBe('a1');
  expect(state.shippingAddressId).toBe('a2');
  expect(state.paymentTermsId).toBe('pt1');
  expect(state.expectedDeliveryDate).toBe('2026-08-28');
  expect(state.remarks).toBe('Rush');
  expect(state.orderDiscountPct).toBe('5');
  expect(state.lines.v1!.qty).toBe(12);
  expect(state.lines.v1!.rate).toBe('499.00');
  // The order *stores* this rate, so it goes back exactly as it stands rather
  // than as `null` for the server to re-resolve from today's price list — that
  // is how an override silently reverted to the list price (I1).
  expect(state.lines.v1!.rateTouched).toBe(true);
  // ...and no list price is invented from it: we never fetched the variant's.
  expect(state.lines.v1!.snapshot.price).toBeNull();
  // The fingerprint of the order as opened, so a save can tell a real line
  // edit from a remarks edit (I3).
  expect(state.hydratedSignature).toBe(draftLineSignature(draftLines(state)));

  await useOrderDraft.persist.rehydrate();
  expect(Object.keys(useOrderDraft.getState().lines)).toEqual(['v1']);
  expect(useOrderDraft.getState().editOrderId).toBe('o1');
  expect(useOrderDraft.getState().remarks).toBe('Rush');
});

test('changing the customer drops what they seeded and keeps the picked lines', () => {
  const s = useOrderDraft.getState();
  s.setCustomer({
    id: 'c1', name: 'Arjun Mehta', code: 'CUS-0001',
    addresses: [address('a1', { is_default_billing: true, is_default_shipping: true })],
    paymentTermsId: 'pt1',
  });
  s.addLines([{ variantId: 'v1', qty: 10, snapshot: snap('WH-TEE-BLK-M', '499') }]);
  useOrderDraft.getState().setHeader({ remarks: 'Gate 3' });

  useOrderDraft.getState().clearCustomer();

  const after = useOrderDraft.getState();
  expect(after.customer).toBeNull();
  // An address belongs to one customer — carrying it to the next one would
  // send the API an id it rejects.
  expect(after.billingAddressId).toBeNull();
  expect(after.shippingAddressId).toBeNull();
  expect(after.paymentTermsId).toBeNull();
  // The lines are the rep's picking work and prices are per-variant, so a
  // sister-firm correction doesn't cost them every SKU.
  expect(Object.keys(after.lines)).toEqual(['v1']);
  expect(after.remarks).toBe('Gate 3');
});
