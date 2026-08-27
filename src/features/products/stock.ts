import type { StockSummary } from './types';
import type { StatusTone } from '@/ui/tokens/colors';

/** Turns a variant's stock summary into the label + tone `StockHint`/`VariantRow`
 * render. `null` (no `stock_balances` row has ever existed for this variant — see
 * `StockSummaryOut`'s own doc) reads the same as zero available: a warning, not an
 * error — stock is informational here, never a hard block on picking a variant. */
export function stockHint(stock: StockSummary | null): { label: string; tone: StatusTone } {
  const available = stock ? Number(stock.available) : 0;
  if (!stock || available <= 0) return { label: 'No stock — order still allowed', tone: 'warning' };
  if (available <= 10) return { label: `Only ${available} left`, tone: 'warning' };
  return { label: `${available} available`, tone: 'success' };
}
