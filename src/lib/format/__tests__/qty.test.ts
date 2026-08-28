import { formatQty, remainingQty } from '@/lib/format/qty';

// Quantities are `numeric(14,3)` strings on the wire. `formatQty` drops the
// column's trailing zeros for display; `remainingQty` does the arithmetic and
// must not leak binary-float noise into a warehouse figure (M4-T6 fix 1: the
// order list showed "0.9000000000000004" under TO DELIVER).

test('formatQty drops the column padding but keeps real decimals', () => {
  expect(formatQty('3.000')).toBe('3');
  expect(formatQty('1.500')).toBe('1.5');
  expect(formatQty('0.000')).toBe('0');
});

test('formatQty leaves a non-numeric value alone rather than printing NaN', () => {
  expect(formatQty('')).toBe('0'); // Number('') === 0 — the empty string is the API's zero
  expect(formatQty('n/a')).toBe('n/a');
});

test('remainingQty subtracts at the column precision, not in binary floats', () => {
  expect(remainingQty('10.000', '9.100')).toBe('0.900');
  expect(remainingQty('0.300', '0.100')).toBe('0.200');
  expect(remainingQty('40.000', '0.000')).toBe('40.000');
  expect(remainingQty('5', '1')).toBe('4.000');
});

test('remainingQty is displayed through formatQty', () => {
  expect(formatQty(remainingQty('10.000', '9.100'))).toBe('0.9');
  expect(formatQty(remainingQty('5', '1'))).toBe('4');
});

test('remainingQty falls back to the ordered quantity on a non-numeric field', () => {
  expect(remainingQty('40.000', 'n/a')).toBe('40.000');
});
