import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mmkvStorage } from '@/store/mmkv';
import { exclusiveRate, computeDocument, type CalcTotals } from '@/lib/sales/calc';
import type { PickedLine, LineSnapshot } from '@/features/products/types';

// Task 4's minimal skeleton — just enough for the browse screen's `CartBadge`
// and "in this order" summary. Task 5 (the order-create wizard) extends this
// same file with customer/header fields and the rest of the line-editing
// actions (rate override, discount, remove-by-swipe, ...); this file is kept
// small and typed so that extension is additive rather than a rewrite.

/** One line as the draft order holds it. `rate`/`rateTouched` exist so a later
 * manual rate edit (Task 5) survives `addLines` re-adding the same variant —
 * only `qty` and the `snapshot` are ever refreshed unconditionally on re-add. */
export type DraftLine = {
  variantId: string;
  qty: number;
  rate: string;
  rateTouched: boolean;
  discountPct: string;
  snapshot: LineSnapshot;
};

type DraftState = {
  lines: Record<string, DraftLine>;
  /** Order-level discount, as a percent string (e.g. `'10'`) — Task 5's header
   * form owns the input; this store just holds it (persisted, like `lines`) so
   * `selectTotals` can fold it into the same `computeDocument` call as the
   * line-level figures. */
  orderDiscountPct: string;
  addLines: (picked: PickedLine[]) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  setOrderDiscountPct: (pct: string) => void;
  reset: () => void;
};

/** The rate a freshly-picked line starts at: the tax-exclusive rate implied by
 * the variant's current price, 2dp — or `''` when the variant has no price at
 * all (nothing to prefill; Task 5's rate field starts blank and required). */
function initialRate(snapshot: LineSnapshot): string {
  if (!snapshot.price) return '';
  return exclusiveRate(snapshot.price.sellingPrice, snapshot.price.taxInclusive, snapshot.taxRate ?? '0').toFixed(2);
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      lines: {},
      orderDiscountPct: '0',
      // Merges by `variantId`: re-picking a variant already in the draft
      // replaces its `qty` and refreshes its `snapshot` (the picker always
      // reflects the product/variant's *current* state), but leaves `rate`
      // alone once the user has touched it themselves.
      addLines: (picked) =>
        set((state) => {
          const lines = { ...state.lines };
          for (const p of picked) {
            const existing = lines[p.variantId];
            lines[p.variantId] = {
              variantId: p.variantId,
              qty: p.qty,
              rate: existing?.rateTouched ? existing.rate : initialRate(p.snapshot),
              rateTouched: existing?.rateTouched ?? false,
              discountPct: existing?.discountPct ?? '0',
              snapshot: p.snapshot,
            };
          }
          return { lines };
        }),
      setQty: (variantId, qty) =>
        set((state) => {
          const line = state.lines[variantId];
          if (!line) return state;
          return { lines: { ...state.lines, [variantId]: { ...line, qty } } };
        }),
      remove: (variantId) =>
        set((state) => {
          const lines = { ...state.lines };
          delete lines[variantId];
          return { lines };
        }),
      setOrderDiscountPct: (pct) => set({ orderDiscountPct: pct }),
      reset: () => set({ lines: {}, orderDiscountPct: '0' }),
    }),
    { name: 'draft', storage: mmkvStorage('draft') },
  ),
);

export function selectLineCount(state: DraftState): number {
  return Object.keys(state.lines).length;
}

export function selectUnitCount(state: DraftState): number {
  return Object.values(state.lines).reduce((sum, l) => sum + l.qty, 0);
}

// `useDraftStore(selectTotals)` runs through zustand's `useSyncExternalStore`,
// which requires a selector's return value to be referentially *stable* for an
// unchanged snapshot — calling `computeDocument` fresh on every invocation
// would hand back a new object each time even when nothing changed, which
// React treats as "the store is still changing" and re-renders forever.
// Cached by the `(lines, orderDiscountPct)` pair — `lines` is only ever
// replaced, never mutated in place, by `addLines`/`setQty`/`remove`/`reset`
// above, and `orderDiscountPct` is a plain string compared by value — so
// repeat calls between real mutations return the exact same reference, while a
// discount-only change (no line change) still recomputes rather than serving
// a stale total from the old `lines`-only key.
let totalsCache: { lines: DraftState['lines']; pct: string; totals: CalcTotals } | null = null;

export function selectTotals(state: DraftState): CalcTotals {
  if (totalsCache && totalsCache.lines === state.lines && totalsCache.pct === state.orderDiscountPct) return totalsCache.totals;
  const lines = Object.values(state.lines).map((l) => ({
    qty: l.qty,
    rate: l.rate,
    discountPct: l.discountPct,
    taxRate: l.snapshot.taxRate ?? '0',
  }));
  const totals = computeDocument(lines, state.orderDiscountPct);
  totalsCache = { lines: state.lines, pct: state.orderDiscountPct, totals };
  return totals;
}
