// Ported verbatim from ace-frontend-web/src/lib/sales.ts (lines 236-397): the
// client-side mirror of the shared calculation engine (app/core/calc on the
// backend). Types + scaledInt, roundHalfUp, allocate, computeDocument,
// exclusiveRate, sameRate — no React, no DOM, no fetch.

/**
 * A line as the editor holds it: raw strings straight out of the inputs.
 */
export type CalcLineInput = {
  qty: string | number;
  rate: string | number;
  discountPct: string | number;
  taxRate: string | number;
};

export type CalcLineResult = {
  gross: number;
  discount: number;
  orderDiscount: number;
  taxable: number;
  tax: number;
  total: number;
};

export type CalcTotals = {
  gross: number;
  lineDiscount: number;
  orderDiscount: number;
  taxable: number;
  tax: number;
  net: number;
  lines: CalcLineResult[];
};

/**
 * Parse a decimal string into an exact integer scaled by `places`, without ever
 * going through a fractional float: `"12.345"` at 3 places is `12345`. Digits
 * beyond `places` are dropped (the API rejects them outright, so they can only
 * be mid-typing noise). Anything unparseable yields 0 — a preview never throws.
 */
function scaledInt(value: string | number, places: number): number {
  const text = (typeof value === 'number' ? String(value) : value).trim();
  if (!text) return 0;
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return 0;
  const [, sign, whole, frac = ''] = match;
  const digits = `${whole || '0'}${(frac + '0'.repeat(places)).slice(0, places)}`;
  const parsed = Number(`${sign}${digits}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** `ROUND_HALF_UP` on a non-negative value, matching `calc.round2` server-side. */
function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * `calc._allocate` in integer paise: split `amount` across `weights` pro-rata,
 * largest-remainder, so the parts sum to the whole exactly.
 */
function allocate(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (amount === 0 || totalWeight === 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (amount * weight) / totalWeight);
  const floors = exact.map((share) => Math.floor(share));
  let leftover = amount - floors.reduce((sum, share) => sum + share, 0);
  const order = exact
    .map((share, index) => ({ index, remainder: share - floors[index]! }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const entry of order) {
    if (leftover <= 0) break;
    floors[entry.index]! += 1;
    leftover -= 1;
  }
  return floors;
}

/**
 * A client-side mirror of `app/core/calc.compute_document`, in integer paise so
 * the arithmetic is exact rather than binary-float approximate.
 *
 * **Display only.** The server recomputes every figure at save time and its
 * numbers are the document's — this exists so the editor can show a running
 * total as the user types, and the detail page shows what was actually stored.
 * Two known-harmless divergences: the tax rate here is the HSN's rate *today*
 * (the server resolves it as of the order date), and a rate the user is still
 * halfway through typing is read as the digits typed so far.
 */
export function computeDocument(
  lines: CalcLineInput[],
  orderDiscountPct: string | number = 0,
): CalcTotals {
  const grossAmounts: number[] = [];
  const lineDiscounts: number[] = [];
  const preTaxables: number[] = [];

  for (const line of lines) {
    // qty is 3 dp, rate 2 dp: the product is scaled by 10^5, so dividing by
    // 10^3 lands back on paise.
    const gross = roundHalfUp((scaledInt(line.qty, 3) * scaledInt(line.rate, 2)) / 1000);
    const discount = roundHalfUp((gross * scaledInt(line.discountPct, 2)) / 10000);
    grossAmounts.push(gross);
    lineDiscounts.push(discount);
    preTaxables.push(gross - discount);
  }

  const preTaxableTotal = preTaxables.reduce((sum, amount) => sum + amount, 0);
  const orderDiscountTotal = Math.min(
    roundHalfUp((preTaxableTotal * scaledInt(orderDiscountPct, 2)) / 10000),
    preTaxableTotal,
  );
  const allocations = allocate(orderDiscountTotal, preTaxables);

  const results: CalcLineResult[] = lines.map((line, index) => {
    const taxable = preTaxables[index]! - allocations[index]!;
    const tax = roundHalfUp((taxable * scaledInt(line.taxRate, 2)) / 10000);
    return {
      gross: grossAmounts[index]! / 100,
      discount: lineDiscounts[index]! / 100,
      orderDiscount: allocations[index]! / 100,
      taxable: taxable / 100,
      tax: tax / 100,
      total: (taxable + tax) / 100,
    };
  });

  const sum = (pick: (result: CalcLineResult) => number) =>
    results.reduce((total, result) => total + pick(result), 0);

  return {
    gross: sum((result) => result.gross),
    lineDiscount: sum((result) => result.discount),
    orderDiscount: sum((result) => result.orderDiscount),
    taxable: sum((result) => result.taxable),
    tax: sum((result) => result.tax),
    net: sum((result) => result.total),
    lines: results,
  };
}

/**
 * The tax-exclusive rate a price represents. A price flagged `tax_inclusive` is
 * the shelf price with GST already inside, and the document always stores the
 * exclusive rate — mirrors `sales.service._prepare_lines`.
 */
export function exclusiveRate(
  sellingPrice: string | number,
  taxInclusive: boolean,
  taxRate: string | number | null | undefined,
): number {
  const price = Number(sellingPrice);
  if (!Number.isFinite(price)) return 0;
  const rate = Number(taxRate ?? 0);
  if (!taxInclusive || !Number.isFinite(rate) || rate <= 0) return price;
  return Math.round((price / (1 + rate / 100)) * 100) / 100;
}

/** Two money strings that differ only in trailing zeros are the same rate. */
export function sameRate(a: string | number, b: string | number): boolean {
  return scaledInt(String(a), 2) === scaledInt(String(b), 2);
}

// ---------------------------------------------------------------------------
// String money arithmetic (M3 Task 3)
// ---------------------------------------------------------------------------

/**
 * Money is a decimal *string* end to end in this app (see `format/money.ts`),
 * and a payment screen still has to add, subtract and compare it — an
 * allocation's running total, "what's left to allocate", "is this more than
 * the receivable". These three helpers are the only sanctioned way to do
 * that: never `Number(a) + Number(b)`.
 *
 * The arithmetic runs on `BigInt` paise, so it is exact at both ends of the
 * range a `number` fails at — the top (`numeric(14,2)` at its ceiling is 16
 * significant digits, past `Number.MAX_SAFE_INTEGER`) and the bottom
 * (`0.1 + 0.2`). Hermes has shipped BigInt since RN 0.70; it is `Intl`, not
 * BigInt, that is missing there.
 *
 * Anything unparseable — `''`, `'12.'`, a stray letter from a keyboard that
 * still shows them — reads as zero rather than `NaN`, because these run on
 * every keystroke of a `MoneyInput` the user is still halfway through typing.
 * Digits past the second decimal are dropped, never rounded up: the API
 * rejects a third decimal outright, so it can only be typing noise, and
 * rounding it *up* would invent money nobody entered.
 */
function toPaise(value: string | number): bigint {
  const text = (typeof value === 'number' ? String(value) : value).trim();
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return 0n;
  const [, sign, whole, frac = ''] = match;
  const digits = `${whole || '0'}${(frac + '00').slice(0, 2)}`;
  return BigInt(`${sign}${digits}`);
}

/** Integer paise back to the canonical 2-dp decimal string. */
function fromPaise(paise: bigint): string {
  const negative = paise < 0n;
  const abs = (negative ? -paise : paise).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${abs.slice(0, -2)}.${abs.slice(-2)}`;
}

/** `a + b`, exactly, as a 2-dp decimal string. */
export function addMoney(a: string | number, b: string | number): string {
  return fromPaise(toPaise(a) + toPaise(b));
}

/** `a - b`, exactly, as a 2-dp decimal string. May be negative (an
 * over-allocated payment's "unallocated" is, and saying so is the point). */
export function subMoney(a: string | number, b: string | number): string {
  return fromPaise(toPaise(a) - toPaise(b));
}

/** `-1 | 0 | 1` by value — `'100'` and `'100.00'` are the same money. */
export function cmpMoney(a: string | number, b: string | number): -1 | 0 | 1 {
  const left = toPaise(a);
  const right = toPaise(b);
  if (left < right) return -1;
  return left > right ? 1 : 0;
}
