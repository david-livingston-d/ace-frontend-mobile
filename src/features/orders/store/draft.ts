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
  /** The line fingerprint (`draftLineSignature`) of the saved order this draft
   * was hydrated from, or `null` for a draft nobody hydrated. `null` while
   * editing would be indistinguishable from "everything changed", which is the
   * safe direction: the PATCH would send `lines`. */
  hydratedSignature: string | null;
  /** The order-level discount the saved order carried at hydration time, or
   * `null` for a draft nobody hydrated. Lets the PATCH tell "nobody touched the
   * order discount" from "the rep changed it" — the same problem `lines` has,
   * but for one field: `sales_order.discount_override` is required whenever a
   * *sent* `order_discount_pct > 0`, so re-sending an untouched discount on a
   * remarks-only edit would ask a rep for a permission the edit never needed. */
  hydratedOrderDiscountPct: string | null;
  customer: DraftCustomer | null;
  lines: Record<string, DraftLine>;
  setCustomer: (customer: DraftCustomer) => void;
  clearCustomer: () => void;
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
  hydratedSignature: null,
  hydratedOrderDiscountPct: null,
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

      // "Change customer" on step 1. Drops the customer *and* everything that
      // was seeded from them (both addresses, their payment terms) — an
      // address belongs to one customer, so carrying it over would send the
      // API an id it will reject. The **lines stay**: they are the rep's
      // picking work, prices are per-variant rather than per-customer, and
      // re-picking every SKU because the order turned out to be for a sister
      // firm would be the app throwing away the only part that took effort.
      // (Only reachable while creating — an order snapshots its customer, so
      // the button is hidden while editing a saved draft.)
      clearCustomer: () =>
        set({ customer: null, billingAddressId: null, shippingAddressId: null, paymentTermsId: null }),

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
              // A line added in this session starts at no discount, always.
              // `setDiscount` is the only way it ever becomes non-zero and the
              // field behind it is rendered only with
              // `sales_order.discount_override` — which is what lets the
              // payload send whatever the line carries without asking the
              // caller's permissions (see `lineIn`).
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
          const orderDiscountPct = Number(order.order_discount_pct) ? String(order.order_discount_pct) : '0';
          const lines: Record<string, DraftLine> = {};
          for (const line of order.lines) {
            lines[line.variant_id] = {
              variantId: line.variant_id,
              qty: Number(line.qty),
              rate: String(line.rate),
              // Touched, because the order *stores* this rate: it may well be
              // an override someone already had the permission for, and a
              // payload that sent `rate: null` for it would have the server
              // re-resolve today's list price — silently reverting a ₹525
              // negotiated line to ₹450 on a save that only meant to change a
              // quantity. Re-sending the stored rate costs nothing when it
              // equals the list price (the server compares before demanding
              // `sales_order.rate_override`) and is honestly rejected with a
              // 403 when the caller may not quote it.
              rateTouched: true,
              // The stored discount, unchanged and regardless of who is
              // editing — the field is hidden without the override
              // permission, so this value cannot be this session's doing.
              discountPct: Number(line.discount_pct) ? String(line.discount_pct) : '0',
              snapshot: {
                sku: line.sku,
                productId: line.product_id,
                productName: line.product_name,
                variantLabel: line.variant_label,
                attributeValues: [],
                taxRate: line.tax_rate,
                // Unknown, not "the stored rate": the order carries what was
                // quoted, which says nothing about the variant's current list
                // price. Inventing one here is what made an override look
                // like a list price and vanish on the next save.
                price: null,
                stock: null,
              },
            };
          }
          return {
            editOrderId: order.id,
            // What the order's lines looked like the moment it was opened, so
            // the PATCH can tell "the rep changed a quantity" from "the rep
            // typed a word into remarks" (see `toSalesOrderPatch`).
            hydratedSignature: draftLineSignature(Object.values(lines)),
            // What the order-level discount looked like the moment it was
            // opened, so the PATCH can omit `order_discount_pct` when nobody
            // touched it (see `toSalesOrderPatch`).
            hydratedOrderDiscountPct: orderDiscountPct,
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
            orderDiscountPct,
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

/** `'450.00'` and `'450'` are the same rate; `'10.00'` and `'10'` are the same
 * discount. Comparing the raw strings would report a draft as edited because a
 * field round-tripped through an input, so every numeric part of the
 * fingerprint is normalised through `Number` first. A value that isn't a
 * number (a half-typed rate) is compared as the trimmed text it is. */
export function signaturePart(value: string): string {
  const text = value.trim();
  const n = Number(text);
  return text !== '' && Number.isFinite(n) ? String(n) : text;
}

/**
 * A comparable fingerprint of the draft's lines — the port of the web's
 * `orderLineSignature`/`orderRowsSignature` (`order-line-editor.tsx`).
 *
 * Only the four things the API stores per line go in, in insertion order:
 * variant, quantity, rate, discount. The snapshot's display fields and its
 * live stock figure are presentation — letting them count would report a draft
 * as edited just because a stock refetch landed.
 */
export function draftLineSignature(lines: DraftLine[]): string {
  return JSON.stringify(
    lines.map((line) => [line.variantId, signaturePart(String(line.qty)), signaturePart(line.rate), signaturePart(line.discountPct || '0')]),
  );
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
