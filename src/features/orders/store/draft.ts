import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mmkvStorage } from '@/store/mmkv';
import { exclusiveRate, computeDocument, type CalcTotals } from '@/lib/sales/calc';
import { defaultAddressId, type Address } from '@/lib/customers/address';
import type { PickedLine, LineSnapshot } from '@/features/products/types';
import type { SalesOrderDetail } from '@/lib/api/types';

// The one draft a Sales rep is building, persisted to MMKV so a killed app (or
// a detour into "create a customer") never loses a half-picked order. Task 4
// created the line-only skeleton; Task 5 extends it — additively — with the
// header the wizard's Cart step edits and the actions its line rows need.

/** One line as the draft order holds it. `rate`/`rateTouched` exist so a
 * manual rate edit survives `addLines` re-adding the same variant — only `qty`
 * and the `snapshot` are ever refreshed unconditionally on re-add — and so the
 * API payload can send `rate: null` for a line nobody re-priced, letting the
 * server resolve the active price itself (no `sales_order.rate_override`
 * needed just because a line was included in a `lines` replace). */
export type DraftLine = {
  variantId: string;
  qty: number;
  rate: string;
  rateTouched: boolean;
  discountPct: string;
  snapshot: LineSnapshot;
};

/** The customer as the draft carries them: enough to render the wizard's
 * summary bar and drive the address/payment-terms pickers without re-fetching. */
export type DraftCustomer = {
  id: string;
  name: string;
  code: string;
  addresses: Address[];
  paymentTermsId: string | null;
};

/** The header fields the Cart step edits, kept together so `setHeader` is one
 * partial assignment rather than six setters. */
export type DraftHeader = {
  billingAddressId: string | null;
  shippingAddressId: string | null;
  paymentTermsId: string | null;
  expectedDeliveryDate: string | null;
  remarks: string;
  orderDiscountPct: string;
};

export type DraftState = DraftHeader & {
  /** Set only while editing a saved draft order — what makes the review step
   * PATCH instead of POST. */
  editOrderId: string | null;
  customer: DraftCustomer | null;
  lines: Record<string, DraftLine>;
  setCustomer: (customer: DraftCustomer) => void;
  setHeader: (patch: Partial<DraftHeader>) => void;
  addLines: (picked: PickedLine[]) => void;
  setQty: (variantId: string, qty: number) => void;
  setRate: (variantId: string, rate: string) => void;
  setDiscount: (variantId: string, pct: string) => void;
  remove: (variantId: string) => void;
  setOrderDiscountPct: (pct: string) => void;
  hydrateFromOrder: (order: SalesOrderDetail) => void;
  reset: () => void;
};

const EMPTY: Omit<DraftState, keyof DraftActions> = {
  editOrderId: null,
  customer: null,
  billingAddressId: null,
  shippingAddressId: null,
  paymentTermsId: null,
  expectedDeliveryDate: null,
  remarks: '',
  orderDiscountPct: '0',
  lines: {},
};

type DraftActions = {
  [K in keyof DraftState as DraftState[K] extends (...args: never[]) => unknown ? K : never]: DraftState[K];
};

/** The rate a freshly-picked line starts at: the tax-exclusive rate implied by
 * the variant's current price, 2dp — or `''` when the variant has no price at
 * all (nothing to prefill; the rate field starts blank and required). */
function initialRate(snapshot: LineSnapshot): string {
  if (!snapshot.price) return '';
  return exclusiveRate(snapshot.price.sellingPrice, snapshot.price.taxInclusive, snapshot.taxRate ?? '0').toFixed(2);
}

/** The address id a jsonb snapshot (`billing_address`/`shipping_address`)
 * points back at — the API stores the source address's `id` inside the
 * snapshot (`sales/service._address_snapshot`), which is the only way an edit
 * can re-select what the order was actually raised against. */
function snapshotAddressId(snapshot: { [key: string]: unknown } | null | undefined): string | null {
  const id = snapshot?.id;
  return typeof id === 'string' && id ? id : null;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      ...EMPTY,

      // Picking a customer pulls their defaults in — the addresses the API
      // would have chosen anyway, and their payment terms — but never
      // *overwrites* a choice already on the draft. That matters because the
      // edit flow seeds the header from the saved order (`hydrateFromOrder`)
      // and only then learns the customer's address list, and the two effects
      // can land in either order.
      setCustomer: (customer) =>
        set((state) => {
          const switched = state.customer !== null && state.customer.id !== customer.id;
          const pick = (current: string | null, side: 'billing' | 'shipping') =>
            switched || !current ? defaultAddressId(customer.addresses, side) || null : current;
          return {
            customer,
            billingAddressId: pick(state.billingAddressId, 'billing'),
            shippingAddressId: pick(state.shippingAddressId, 'shipping'),
            paymentTermsId: switched || !state.paymentTermsId ? customer.paymentTermsId : state.paymentTermsId,
          };
        }),

      setHeader: (patch) => set(patch),

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

      // A stepper taken to zero *is* a removal — an order line of zero units
      // is not a thing the API accepts, and leaving it would fail validation
      // at the end of the wizard rather than at the tap that caused it.
      setQty: (variantId, qty) =>
        set((state) => {
          const line = state.lines[variantId];
          if (!line) return state;
          if (qty <= 0) {
            const lines = { ...state.lines };
            delete lines[variantId];
            return { lines };
          }
          return { lines: { ...state.lines, [variantId]: { ...line, qty } } };
        }),

      setRate: (variantId, rate) =>
        set((state) => {
          const line = state.lines[variantId];
          if (!line) return state;
          return { lines: { ...state.lines, [variantId]: { ...line, rate, rateTouched: true } } };
        }),

      setDiscount: (variantId, pct) =>
        set((state) => {
          const line = state.lines[variantId];
          if (!line) return state;
          return { lines: { ...state.lines, [variantId]: { ...line, discountPct: pct } } };
        }),

      remove: (variantId) =>
        set((state) => {
          const lines = { ...state.lines };
          delete lines[variantId];
          return { lines };
        }),

      setOrderDiscountPct: (pct) => set({ orderDiscountPct: pct }),

      hydrateFromOrder: (order) =>
        set((state) => {
          const lines: Record<string, DraftLine> = {};
          for (const line of order.lines) {
            lines[line.variant_id] = {
              variantId: line.variant_id,
              qty: Number(line.qty),
              rate: String(line.rate),
              // Starts untouched: re-opening a draft must not resend every
              // line's rate as an explicit override just because the line is
              // included in a `lines` replace (the same rule the web form
              // follows). The *stored* rate stands in for the list price so
              // the line never reads as "no price — type a rate" either.
              rateTouched: false,
              discountPct: Number(line.discount_pct) ? String(line.discount_pct) : '0',
              snapshot: {
                sku: line.sku,
                productId: line.product_id,
                productName: line.product_name,
                variantLabel: line.variant_label,
                attributeValues: [],
                taxRate: line.tax_rate,
                price: { sellingPrice: String(line.rate), taxInclusive: false },
                stock: null,
              },
            };
          }
          return {
            editOrderId: order.id,
            // Keep the full customer record (addresses and all) when it is
            // already the right one — the order detail carries only a name.
            customer:
              state.customer?.id === order.customer_id
                ? state.customer
                : {
                    id: order.customer_id,
                    name: order.customer_name,
                    code: '',
                    addresses: [],
                    paymentTermsId: order.payment_terms_id,
                  },
            billingAddressId: snapshotAddressId(order.billing_address),
            shippingAddressId: snapshotAddressId(order.shipping_address),
            paymentTermsId: order.payment_terms_id,
            expectedDeliveryDate: order.expected_delivery_date,
            remarks: order.remarks ?? '',
            orderDiscountPct: Number(order.order_discount_pct) ? String(order.order_discount_pct) : '0',
            lines,
          };
        }),

      reset: () => set({ ...EMPTY }),
    }),
    { name: 'draft', storage: mmkvStorage('draft') },
  ),
);

/** The name the wizard's own modules use — same store, read as "the order
 * draft" rather than "the draft store" at the call sites that build an order. */
export const useOrderDraft = useDraftStore;

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
// replaced, never mutated in place, by the actions above, and
// `orderDiscountPct` is a plain string compared by value — so repeat calls
// between real mutations return the exact same reference, while a
// discount-only change (no line change) still recomputes rather than serving
// a stale total from the old `lines`-only key.
let totalsCache: { lines: DraftState['lines']; pct: string; totals: CalcTotals } | null = null;

export function selectTotals(state: DraftState): CalcTotals {
  if (totalsCache && totalsCache.lines === state.lines && totalsCache.pct === state.orderDiscountPct) return totalsCache.totals;
  const totals = computeDocument(draftLineInputs(state), state.orderDiscountPct);
  totalsCache = { lines: state.lines, pct: state.orderDiscountPct, totals };
  return totals;
}

/** The draft's lines in the one order everything else agrees on — insertion
 * order, which a `Record` keyed by (never integer-like) UUID strings
 * preserves, including across a JSON persist round trip. The API's
 * `row_index` on a rejected line indexes into exactly this. */
export function draftLines(state: DraftState): DraftLine[] {
  return Object.values(state.lines);
}

/** `computeDocument`'s inputs for the draft, in `draftLines` order — shared by
 * `selectTotals` and by the review step, which needs the per-line results. */
export function draftLineInputs(state: DraftState) {
  return draftLines(state).map((l) => ({
    qty: l.qty,
    rate: l.rate,
    discountPct: l.discountPct,
    taxRate: l.snapshot.taxRate ?? '0',
  }));
}
