import { useDraftStore, selectTotals } from '@/features/orders/store/draft';
import type { LineSnapshot } from '@/features/products/types';

// `selectTotals` is cached (see the comment above `totalsCache` in draft.ts) so
// that repeated `useSyncExternalStore` reads between real mutations return the
// exact same reference — otherwise zustand treats a brand-new object as "the
// store is still changing" and loops forever. The cache used to key only on
// `state.lines`, which meant an `orderDiscountPct`-only change (Task 5's header
// discount field) would silently serve a stale total. These tests cover both:
// the cache still holding when nothing changed, and it invalidating when only
// the discount changes.

const snapshot: LineSnapshot = {
  sku: 'SKU-1',
  productId: 'p1',
  productName: 'Product 1',
  variantLabel: null,
  attributeValues: [],
  taxRate: '5',
  price: { sellingPrice: '100.00', taxInclusive: false },
  stock: null,
};

beforeEach(() => {
  useDraftStore.getState().reset();
});

test('totals recompute when orderDiscountPct changes with the same lines', () => {
  useDraftStore.getState().addLines([{ variantId: 'v1', qty: 10, snapshot }]);

  const before = selectTotals(useDraftStore.getState());
  expect(before.net).toBeCloseTo(1050); // 10 * 100 + 5% tax, 0% order discount

  useDraftStore.getState().setOrderDiscountPct('10');
  const after = selectTotals(useDraftStore.getState());

  expect(after).not.toBe(before);
  expect(after.net).toBeLessThan(before.net);
  expect(after.orderDiscount).toBeGreaterThan(0);
});

test('referential stability holds when neither lines nor orderDiscountPct change', () => {
  useDraftStore.getState().addLines([{ variantId: 'v1', qty: 10, snapshot }]);
  useDraftStore.getState().setOrderDiscountPct('10');

  const first = selectTotals(useDraftStore.getState());
  const second = selectTotals(useDraftStore.getState());

  expect(second).toBe(first);
});
