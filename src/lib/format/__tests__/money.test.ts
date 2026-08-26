import { formatMoney, formatMoneyShort } from '@/lib/format/money';
test.each([
  ['0', '₹0.00'], ['999', '₹999.00'], ['1000', '₹1,000.00'], ['100000', '₹1,00,000.00'],
  ['12345678.05', '₹1,23,45,678.05'], ['-1234.5', '-₹1,234.50'], ['-0.001', '₹0.00'], [null, '—'], [undefined, '—'],
])('formatMoney(%s) = %s', (input, expected) => { expect(formatMoney(input as never)).toBe(expected); });
test.each([['104700', '₹1.05 L'], ['99975', '₹99.9 K'], ['172460', '₹1.72 L'], ['12000000', '₹1.20 Cr'], ['850', '₹850']])(
  'formatMoneyShort(%s) = %s', (i, e) => { expect(formatMoneyShort(i)).toBe(e); });
test('does not rely on Intl', () => {
  const saved = globalThis.Intl; // @ts-expect-error simulate Hermes without ICU
  globalThis.Intl = undefined;
  try { expect(formatMoney('1234567.89')).toBe('₹12,34,567.89'); } finally { globalThis.Intl = saved; }
});
