import { draftLines, draftLineSignature, type DraftLine, type DraftState } from './store/draft';
import type { Schemas } from '@/lib/api/types';
import type { SalesOrderIn, SalesOrderPatch } from './types';

type SalesOrderLineIn = Schemas['SalesOrderLineIn'];

// Draft -> API. The rules here are the client half of a server contract, not
// cosmetics: sending a rate the caller didn't type, or a discount they can't
// set, turns a perfectly ordinary save into a 403.

/**
 * One line's payload — the values the draft actually holds, never a value
 * chosen to keep the server quiet.
 *
 * `rate: null` for an untouched line tells the server "use whatever the active
 * price is", so a line nobody re-priced never demands
 * `sales_order.rate_override`. A *touched* line — one the user edited, or one
 * hydrated from a saved order, whose stored rate may be an override someone
 * already holds the permission for — sends that rate at 2dp, the scale the API
 * stores. Sending it costs nothing when it equals the list price (the server
 * compares first) and earns an honest 403 when it doesn't.
 *
 * `discount_pct` is whatever the line carries, for everybody. A line added in
 * this session starts at `'0'` and only `setDiscount` — behind a field that is
 * rendered only with `sales_order.discount_override` — moves it, so a non-zero
 * discount here is always either that permission's holder or the saved order's
 * own value. Zeroing it "to be safe" wiped a discount the edit never touched.
 */
function lineIn(line: DraftLine): SalesOrderLineIn {
  return {
    variant_id: line.variantId,
    qty: String(line.qty),
    rate: line.rateTouched ? Number(line.rate).toFixed(2) : null,
    discount_pct: line.discountPct.trim() || '0',
    remarks: null,
  };
}

function commonBody(state: DraftState) {
  return {
    billing_address_id: state.billingAddressId || null,
    shipping_address_id: state.shippingAddressId || null,
    expected_delivery_date: state.expectedDeliveryDate || null,
    payment_terms_id: state.paymentTermsId || null,
    remarks: state.remarks.trim() || null,
  };
}

/** `POST /sales-orders`. `order_date` is the caller's today (IST) — the server
 * resolves the financial year, the document number and every line's tax rate
 * from it, and it can never be changed afterwards. */
export function toSalesOrderIn(state: DraftState, today: string): SalesOrderIn {
  return {
    ...commonBody(state),
    customer_id: state.customer?.id ?? '',
    order_date: today,
    order_discount_pct: state.orderDiscountPct.trim() || '0',
    lines: draftLines(state).map(lineIn),
  };
}

/**
 * `PATCH /sales-orders/{id}` for a draft.
 *
 * Never `customer_id` (the order snapshots its customer — a different customer
 * is a different order) and never `order_date` (locked once the order is
 * numbered; sending it unchanged only risks a 422 for nothing).
 *
 * `lines` is a **full replace, sent only when the lines actually changed** —
 * the web form's rule (`order-form.tsx`, `linesChanged`), ported. The server
 * reads a `lines` key as "the caller is re-authoring every line": it re-prices
 * each one and, on an order carrying an order-level discount, refuses the
 * whole replace without `sales_order.discount_override`. Re-sending an
 * untouched line-set just to edit the remarks would therefore ask for
 * permissions the edit doesn't need — and put every line's rate back through a
 * check it never had to face.
 */
export function toSalesOrderPatch(state: DraftState): SalesOrderPatch {
  const lines = draftLines(state);
  const patch: SalesOrderPatch = {
    ...commonBody(state),
    order_discount_pct: state.orderDiscountPct.trim() || '0',
  };
  // No fingerprint means nothing was hydrated to compare against — send the
  // lines, since "unchanged" cannot be established.
  if (state.hydratedSignature === null || draftLineSignature(lines) !== state.hydratedSignature) {
    patch.lines = lines.map(lineIn);
  }
  return patch;
}

export type DraftValidation = {
  customer?: string;
  header?: string;
  lines?: Record<string, string>;
};

export type ValidateOptions = {
  /** `sales_order.rate_override`. Only changes the *wording* of the no-price
   * error: without it there is no rate field on the row, so telling the user
   * to type one is an instruction they cannot follow. Defaults to permissive,
   * which is also what a caller that doesn't care about copy gets. */
  canOverrideRate?: boolean;
};

/**
 * The web's `validateOrderLines` rules, plus the header checks the wizard can
 * make on its own. A preview of what the server would reject, so the Cart step
 * can point at the offending row before a round trip — the server still
 * re-checks everything.
 */
export function validateDraft(state: DraftState, options: ValidateOptions = {}): DraftValidation {
  const canOverrideRate = options.canOverrideRate ?? true;
  const result: DraftValidation = {};
  if (!state.customer) result.customer = 'Pick a customer first.';

  const lines = draftLines(state);
  if (lines.length === 0) {
    result.header = 'Add at least one line.';
    return result;
  }

  const lineErrors: Record<string, string> = {};
  for (const line of lines) {
    if (!Number.isFinite(line.qty) || line.qty <= 0) {
      lineErrors[line.variantId] = 'Quantity must be greater than zero.';
      continue;
    }
    const rate = Number(line.rate);
    if (!line.rate.trim() || !Number.isFinite(rate) || rate < 0) {
      // `rateTouched` covers the hydrated case: a saved order's line carries a
      // rate but no knowledge of the variant's current list price, so blanking
      // it is "type a rate", not "this SKU has no price" (which we don't know).
      if (line.snapshot.price || line.rateTouched) {
        lineErrors[line.variantId] = 'Enter a rate.';
      } else {
        lineErrors[line.variantId] = canOverrideRate
          ? 'Enter a rate — this SKU has no active price.'
          : 'This SKU has no active price. Remove this line, or ask for a price to be set.';
      }
      continue;
    }
    const discount = Number(line.discountPct || 0);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      lineErrors[line.variantId] = 'Discount must be between 0 and 100%.';
      continue;
    }
    if (!line.snapshot.taxRate) {
      lineErrors[line.variantId] = "This SKU's HSN has no active GST rate — set one under HSN & Tax first.";
    }
  }
  if (Object.keys(lineErrors).length > 0) result.lines = lineErrors;

  const orderDiscount = Number(state.orderDiscountPct || 0);
  if (!Number.isFinite(orderDiscount) || orderDiscount < 0 || orderDiscount > 100) {
    result.header = 'Order discount must be between 0 and 100%.';
  }
  if (state.customer && !state.billingAddressId) {
    result.header = 'This customer has no address on file. Add one on the web before ordering.';
  }
  return result;
}

/** Nothing to fix — the Cart step's "Review order" is only live when this holds. */
export function isDraftValid(validation: DraftValidation): boolean {
  return !validation.customer && !validation.header && !validation.lines;
}
