import { formatMoney, formatMoneyShort } from '@/lib/format/money';
test.each([
  ['0', '₹0.00'], ['999', '₹999.00'], ['1000', '₹1,000.00'], ['100000', '₹1,00,000.00'],
  ['12345678.05', '₹1,23,45,678.05'], ['-1234.5', '-₹1,234.50'], ['-0.001', '₹0.00'], [null, '—'], [undefined, '—'],
])('formatMoney(%s) = %s', (input, expected) => { expect(formatMoney(input as never)).toBe(expected); });
test.each([
  ['104700', '₹1.05 L'], ['99975', '₹99.9 K'], ['172460', '₹1.72 L'], ['12000000', '₹1.20 Cr'], ['850', '₹850'],
  // Promotion at a unit's own `.995` rounding threshold: 99995 rounds to 1.00 L
  // (not left as a truncated "99.9 K"), and 9999999 rounds to 1.00 Cr (not
  // "100.00 L" or a floor-truncated "99.99 L").
  ['99995', '₹1.00 L'], ['9999999', '₹1.00 Cr'], ['12345678', '₹1.23 Cr'],
])('formatMoneyShort(%s) = %s', (i, e) => { expect(formatMoneyShort(i)).toBe(e); });
test('does not rely on Intl', () => {
  const saved = globalThis.Intl; // @ts-expect-error simulate Hermes without ICU
  globalThis.Intl = undefined;
  try { expect(formatMoney('1234567.89')).toBe('₹12,34,567.89'); } finally { globalThis.Intl = saved; }
});
test('formats very large decimal strings without going through Number (which would lose precision)', () => {
  // The brief's literal expected string ('₹99,99,99,99,99,999.99') has only 13
  // nines for a 14-nine input — one digit short of the real Indian grouping of
  // '99999999999999' (verified against the already-passing '12345678.05' ->
  // '₹1,23,45,678.05' case, whose same grouping function this reuses). Corrected
  // to '9,99,99,99,99,99,999' so the assertion doesn't encode a dropped digit.
  expect(formatMoney('99999999999999.99')).toBe('₹9,99,99,99,99,99,999.99');
  expect(formatMoney('0.5')).toBe('₹0.50');
});
