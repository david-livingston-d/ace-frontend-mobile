import { stockHint } from '../stock';

test('no stock summary at all reads as a warning, order still allowed', () => {
  expect(stockHint(null)).toEqual({ label: 'No stock — order still allowed', tone: 'warning' });
});

test('plenty available reads as success', () => {
  expect(stockHint({ actual: '140', reserved: '0', available: '140' })).toEqual({ label: '140 available', tone: 'success' });
});

test('10 or fewer available reads as a low-stock warning', () => {
  expect(stockHint({ actual: '8', reserved: '0', available: '8' })).toEqual({ label: 'Only 8 left', tone: 'warning' });
});

test('zero available reads the same as no stock at all', () => {
  expect(stockHint({ actual: '0', reserved: '0', available: '0' })).toEqual({ label: 'No stock — order still allowed', tone: 'warning' });
});
