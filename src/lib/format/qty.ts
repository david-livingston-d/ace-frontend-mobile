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

/** What is still owed on a line or an order — `ordered - delivered`, which is
 * the number a rep is actually asked about and which no endpoint sends. */
export function remainingQty(ordered: string, delivered: string): string {
  return formatQty(String(Number(ordered) - Number(delivered)));
}
