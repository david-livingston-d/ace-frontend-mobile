/**
 * A tax rate as it is spoken, not as the column stores it.
 *
 * Rates cross the wire as `numeric(5,2)` decimal *strings*, so a plain 5 %
 * arrives as `'5.00'` and a half-point rate as `'12.50'`. The trailing zeros
 * are an artefact of the column type, not information — "GST 5.00%" reads as a
 * precision somebody quoted deliberately. Exactly the call `formatQty` makes
 * for quantities.
 *
 * A rate is a percentage, never money: it is small, bounded and only ever
 * displayed, so `Number` is safe here in a way it never is for an amount.
 * Returns the raw string untouched if it isn't numeric at all, rather than
 * rendering `NaN`.
 */
export function formatRate(raw: string | number): string {
  const n = Number(raw);
  return Number.isFinite(n) ? String(n) : String(raw);
}
