import { ORDER_FILTER_PRESETS, presetParams } from '@/features/orders/filters';
test('presets map to the register\'s query params', () => {
  expect(presetParams('pendingPayment')).toEqual({ open: true, outstanding_only: true });
  expect(presetParams('overdue')).toEqual({ overdue: true });
  expect(Object.keys(ORDER_FILTER_PRESETS)).toHaveLength(8);
});
