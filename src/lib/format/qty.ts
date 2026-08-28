/**
 * Quantities cross the wire as decimal *strings* (`numeric(14,3)`), so a
 * whole three pieces arrive as `'3.000'`. Nobody in a warehouse writes it that
 * way: the trailing zeros are an artefact of the column type, not information.
 * Fractional quantities (a metre and a half of fabric) keep their digits.
 */
export function formatQty(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? String(n) : raw;
}

/**
 * What is still owed on a line or an order — `ordered - delivered`, which is
 * the number a rep is actually asked about and which no endpoint sends.
 *
 * Subtracted in integer **thousandths**, the column's own precision: plain
 * float subtraction printed `10.000 - 9.100` as `0.9000000000000004` on the
 * order list and the delivery table. Returns the same `numeric(14,3)` string
 * shape the API sends, so the caller displays it through `formatQty` exactly
 * like any other quantity.
 */
export function remainingQty(ordered: string, delivered: string): string {
  const a = Number(ordered);
  const b = Number(delivered);
  // A non-numeric field is the API's problem, not something to render as NaN:
  // fall back to the ordered quantity, which is what "still owed" means when
  // nothing is known to have been delivered.
  if (!Number.isFinite(a) || !Number.isFinite(b)) return ordered;
  return ((Math.round(a * 1000) - Math.round(b * 1000)) / 1000).toFixed(3);
}
