import { ORDER_FILTER_PRESETS, presetParams, filtersToParams } from '@/features/orders/filters';
test('presets map to the register\'s query params', () => {
  expect(presetParams('pendingPayment')).toEqual({ open: true, outstanding_only: true });
  expect(presetParams('overdue')).toEqual({ overdue: true });
  // M2 adds `stockShortage` to the preset table (below) alongside the original 8.
  expect(Object.keys(ORDER_FILTER_PRESETS)).toHaveLength(9);
});

test('filters map to the register params; booleans only when true', () => {
  expect(filtersToParams({ preset: 'pendingPayment', q: 'urban', dateFrom: '2026-08-01', dateTo: '2026-08-12', customerId: 'c1', salesUserId: 'u1' }))
    .toEqual({ open: true, outstanding_only: true, q: 'urban', date_from: '2026-08-01', date_to: '2026-08-12', customer_id: 'c1', sales_user_id: 'u1' });
  expect(filtersToParams({})).toEqual({ open: true });                       // default = unclosed
  expect(filtersToParams({ preset: 'closed' })).toEqual({ phase: 'closed' });
  expect(filtersToParams({ openShortage: true })).toEqual({ open: true, open_shortage: true });
  expect(Object.keys(ORDER_FILTER_PRESETS)).toContain('stockShortage');
});
