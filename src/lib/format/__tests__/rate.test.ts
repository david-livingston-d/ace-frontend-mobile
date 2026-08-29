import { formatRate } from '@/lib/format/rate';

// `numeric(5,2)` gives every rate two decimals; only the ones that carry
// information survive to the screen.
test('drops the column-type trailing zeros', () => {
  expect(formatRate('5.00')).toBe('5');
  expect(formatRate('12.00')).toBe('12');
  expect(formatRate('0.00')).toBe('0');
});

test('keeps a genuinely fractional rate', () => {
  expect(formatRate('12.50')).toBe('12.5');
  expect(formatRate('0.25')).toBe('0.25');
});

test('passes a non-numeric value through rather than rendering NaN', () => {
  expect(formatRate('')).toBe('0'); // Number('') is 0, which is what an empty rate means
  expect(formatRate('n/a')).toBe('n/a');
});
