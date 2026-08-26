/**
 * Money crosses the wire as a decimal *string* (`numeric(14,2)`), never a JS
 * number, so nothing is rounded in transit. Rendered in the Indian grouping
 * convention the business actually reads (₹1,00,000.00) — done by hand rather
 * than `toLocaleString('en-IN', ...)` because Hermes ships without the ICU
 * data `Intl` needs, so `Intl`/`toLocaleString` cannot be relied on here.
 */
function groupIndian(intPart: string) {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  const cents = Math.round(Math.abs(n) * 100);
  const sign = n < 0 && cents > 0 ? '-' : '';
  const intPart = Math.floor(cents / 100).toString();
  const frac = (cents % 100).toString().padStart(2, '0');
  return `${sign}₹${groupIndian(intPart)}.${frac}`;
}

/**
 * The same amount without the paise, abbreviated to lakh/crore for the dense
 * insight cells where six figures share little space.
 */
export function formatMoneyShort(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  // Cr/L values round normally (toFixed(2)), which can round a value *up*
  // into the unit above (e.g. 9,999,999 is technically "under a crore" but
  // 99.99999 L rounds to "100.00 L"). Rather than let a tile claim a round
  // number it hasn't reached, promote: once a tier's own value would round
  // up to 100 of itself (threshold `.995`, where toFixed(2) rounds to the
  // next whole unit), format it in the tier above instead.
  const crPromote = abs >= 1e5 && abs / 1e5 >= 99.995; // would show "100.00 L"
  if (abs >= 1e7 || crPromote) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  const lPromote = abs >= 1e3 && abs / 1e3 >= 99.995; // would show "100.0 K"
  if (abs >= 1e5 || lPromote) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  // Truncated, not rounded: a value just under the L-promotion threshold
  // above (e.g. 99,975) must read "99.9 K", never "100.0 K" — rounding up
  // across the K/L boundary would visually promise a lakh that isn't there.
  if (abs >= 1e3) return `${sign}₹${(Math.floor((abs / 1e3) * 10) / 10).toFixed(1)} K`;
  return `${sign}₹${Math.round(abs)}`;
}
