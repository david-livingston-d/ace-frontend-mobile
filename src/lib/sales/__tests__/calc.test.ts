import {
  addMoney,
  cmpMoney,
  computeDocument,
  exclusiveRate,
  sameRate,
  subMoney,
  type CalcLineInput,
} from '@/lib/sales/calc';

// Ported from ace-backend/tests/test_calc.py — same qty/rate/discount/tax
// inputs, same expected 2dp outputs, so the client-side mirror stays
// byte-identical (well, cent-identical) with the server's Decimal engine.

function line(partial: Partial<CalcLineInput> & Pick<CalcLineInput, 'qty' | 'rate'>): CalcLineInput {
  return { discountPct: 0, taxRate: 0, ...partial };
}

test('single line, no discounts', () => {
  const totals = computeDocument([line({ qty: 10, rate: '100.00', taxRate: 5 })]);
  const l = totals.lines[0]!;
  expect([l.gross, l.discount, l.orderDiscount]).toEqual([1000, 0, 0]);
  expect([l.taxable, l.tax, l.total]).toEqual([1000, 50, 1050]);
  expect([totals.gross, totals.taxable, totals.tax, totals.net]).toEqual([1000, 1000, 50, 1050]);
  expect(totals.lineDiscount).toBe(0);
  expect(totals.orderDiscount).toBe(0);
});

test('line discount and tax rounding', () => {
  // gross 333.33 * 7.5% = 24.99975 -> 25.00; taxable 308.33; tax @12% = 36.9996 -> 37.00
  const totals = computeDocument([line({ qty: 3, rate: '111.11', discountPct: '7.5', taxRate: 12 })]);
  const l = totals.lines[0]!;
  expect(l.gross).toBeCloseTo(333.33, 2);
  expect(l.discount).toBeCloseTo(25.0, 2);
  expect(l.taxable).toBeCloseTo(308.33, 2);
  expect(l.tax).toBeCloseTo(37.0, 2);
  expect(l.total).toBeCloseTo(345.33, 2);
});

test('qty * rate product is rounded to two places', () => {
  // 3.333 x 10.05 = 33.49665 -> 33.50
  const totals = computeDocument([line({ qty: '3.333', rate: '10.05' })]);
  expect(totals.lines[0]!.gross).toBeCloseTo(33.5, 2);
  expect(totals.gross).toBeCloseTo(33.5, 2);
});

test('document totals are sums of lines', () => {
  const totals = computeDocument([
    line({ qty: 2, rate: '150.00', discountPct: 10, taxRate: 5 }),
    line({ qty: 7, rate: '99.99', taxRate: 18 }),
    line({ qty: 1, rate: '1250.00', discountPct: '2.5', taxRate: 12 }),
  ]);
  const sum = (pick: (l: (typeof totals.lines)[number]) => number) => totals.lines.reduce((s, l) => s + pick(l), 0);
  expect(totals.gross).toBeCloseTo(sum((l) => l.gross), 2);
  expect(totals.lineDiscount).toBeCloseTo(sum((l) => l.discount), 2);
  expect(totals.taxable).toBeCloseTo(sum((l) => l.taxable), 2);
  expect(totals.tax).toBeCloseTo(sum((l) => l.tax), 2);
  expect(totals.net).toBeCloseTo(totals.taxable + totals.tax, 2);
});

test('order discount allocation sums exactly', () => {
  const lines = [
    line({ qty: 1, rate: '100.03', taxRate: 5 }),
    line({ qty: 1, rate: '200.07', taxRate: 5 }),
    line({ qty: 1, rate: '299.90', taxRate: 5 }),
  ];
  const totals = computeDocument(lines, '7.77');
  // 600.00 * 7.77% = 46.62
  expect(totals.orderDiscount).toBeCloseTo(46.62, 2);
  const sumAlloc = totals.lines.reduce((s, l) => s + l.orderDiscount, 0);
  expect(sumAlloc).toBeCloseTo(totals.orderDiscount, 2);
  expect(totals.taxable).toBeCloseTo(600.0 - 46.62, 2);
  expect(totals.taxable).toBeCloseTo(totals.lines.reduce((s, l) => s + l.taxable, 0), 2);
});

test('order discount allocation is pro rata', () => {
  const totals = computeDocument([line({ qty: 1, rate: '300.00' }), line({ qty: 1, rate: '100.00' })], 10);
  expect(totals.orderDiscount).toBeCloseTo(40.0, 2);
  expect(totals.lines.map((l) => l.orderDiscount)).toEqual([30, 10]);
});

test('order discount leftover paisa goes to largest remainder', () => {
  // Three equal lines sharing 10.00: exact shares are 3.3333..., floors 3.33
  // each, and the leftover paisa must land on exactly one line.
  const lines = [line({ qty: 1, rate: '100.00' }), line({ qty: 1, rate: '100.00' }), line({ qty: 1, rate: '100.00' })];
  const totals = computeDocument(lines, '3.3333');
  const allocations = totals.lines.map((l) => l.orderDiscount);
  expect(allocations.reduce((s, a) => s + a, 0)).toBeCloseTo(totals.orderDiscount, 2);
  expect(Math.max(...allocations) - Math.min(...allocations)).toBeLessThanOrEqual(0.01 + 1e-9);
});

test('order discount applies after line discount', () => {
  const totals = computeDocument([line({ qty: 10, rate: '100.00', discountPct: 10, taxRate: 18 })], 10);
  const l = totals.lines[0]!;
  expect(l.gross).toBeCloseTo(1000.0, 2);
  expect(l.discount).toBeCloseTo(100.0, 2); // 10% of gross
  expect(l.orderDiscount).toBeCloseTo(90.0, 2); // 10% of the 900 that remains
  expect(l.taxable).toBeCloseTo(810.0, 2);
  expect(l.tax).toBeCloseTo(145.8, 2); // tax is on the post-discount taxable
});

test('zero discount leaves lines untouched', () => {
  const totals = computeDocument([line({ qty: 5, rate: '20.00', taxRate: 5 })], 0);
  expect(totals.orderDiscount).toBe(0);
  expect(totals.lines[0]!.orderDiscount).toBe(0);
  expect(totals.lines[0]!.taxable).toBeCloseTo(100.0, 2);
});

test('100% line discount gives zero taxable and tax', () => {
  const totals = computeDocument([line({ qty: 4, rate: '250.00', discountPct: 100, taxRate: 18 })]);
  const l = totals.lines[0]!;
  expect([l.gross, l.discount, l.taxable, l.tax, l.total]).toEqual([1000, 1000, 0, 0, 0]);
  expect(totals.net).toBe(0);
});

test('100% order discount gives zero net', () => {
  const totals = computeDocument(
    [line({ qty: 2, rate: '150.00', taxRate: 12 }), line({ qty: 1, rate: '75.50', taxRate: 5 })],
    100,
  );
  expect(totals.orderDiscount).toBeCloseTo(totals.gross, 2);
  expect(totals.taxable).toBe(0);
  expect(totals.tax).toBe(0);
  expect(totals.net).toBe(0);
});

test('zero-value lines get no allocation', () => {
  // A free line (rate 0) has no taxable to discount; the whole order discount
  // must still land on the paying line and still sum exactly.
  const totals = computeDocument([line({ qty: 1, rate: '0.00' }), line({ qty: 1, rate: '500.00' })], 10);
  expect(totals.lines.map((l) => l.orderDiscount)).toEqual([0, 50]);
  expect(totals.orderDiscount).toBe(50);
});

test('empty document is all zeros', () => {
  const totals = computeDocument([], 10);
  expect(totals.lines).toEqual([]);
  expect([totals.gross, totals.lineDiscount, totals.orderDiscount]).toEqual([0, 0, 0]);
  expect([totals.taxable, totals.tax, totals.net]).toEqual([0, 0, 0]);
});

test('exclusiveRate strips GST out of a tax-inclusive price', () => {
  expect(exclusiveRate('112', true, 12)).toBeCloseTo(100.0, 2);
});

test('exclusiveRate is a no-op for a tax-exclusive price', () => {
  expect(exclusiveRate('100', false, 12)).toBe(100);
});

test('sameRate ignores trailing-zero formatting differences', () => {
  expect(sameRate('100', '100.00')).toBe(true);
  expect(sameRate('100', '100.01')).toBe(false);
});

// --- string money arithmetic (M3 Task 3) ----------------------------------
// Payment amounts and allocations are added/subtracted/compared exactly,
// never through a JS `number` — these are the helpers the allocation reducer
// and the "excess becomes advance" hint are built on.

test('addMoney/subMoney return a 2-dp decimal string', () => {
  expect(addMoney('11200.00', '800.50')).toBe('12000.50');
  expect(subMoney('11200.00', '800.50')).toBe('10399.50');
  expect(addMoney('20000', '0')).toBe('20000.00');
});

test('subMoney can go negative', () => {
  expect(subMoney('100.00', '250.00')).toBe('-150.00');
  expect(subMoney('0', '0.01')).toBe('-0.01');
});

test('cmpMoney compares by value, not by string', () => {
  expect(cmpMoney('100', '100.00')).toBe(0);
  expect(cmpMoney('100.01', '100.00')).toBe(1);
  expect(cmpMoney('99.99', '100')).toBe(-1);
  expect(cmpMoney('-1.00', '0')).toBe(-1);
});

test('money arithmetic is exact past the float safe-integer range', () => {
  // 99999999999999.99 is `numeric(14,2)` at its ceiling: `Number(x) * 100`
  // already loses digits here, so these must not go through a float.
  expect(addMoney('99999999999999.98', '0.01')).toBe('99999999999999.99');
  expect(cmpMoney('99999999999999.99', '99999999999999.98')).toBe(1);
});

test('money arithmetic is exact where binary floats are not', () => {
  expect(addMoney('0.1', '0.2')).toBe('0.30');
  expect(subMoney('1.10', '1.00')).toBe('0.10');
});

test('a half-typed or empty money string reads as zero rather than NaN', () => {
  expect(addMoney('', '5.00')).toBe('5.00');
  expect(addMoney('12.', '0')).toBe('12.00');
  expect(cmpMoney('', '0')).toBe(0);
});

test('digits past 2 dp are dropped, never rounded up into the paise', () => {
  expect(addMoney('1.239', '0')).toBe('1.23');
});
