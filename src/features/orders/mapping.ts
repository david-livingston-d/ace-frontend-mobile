import { draftLines, type DraftLine, type DraftState } from './store/draft';
import type { Schemas } from '@/lib/api/types';
import type { SalesOrderIn, SalesOrderPatch } from './types';

type SalesOrderLineIn = Schemas['SalesOrderLineIn'];

// Draft -> API. The rules here are the client half of a server contract, not
// cosmetics: sending a rate the caller didn't type, or a discount they can't
// set, turns a perfectly ordinary save into a 403.

/**
 * One line's payload.
 *
 * `rate: null` for an untouched line is the important one — it tells the
 * server "use whatever the active price is", so including a line in a `lines`
 * replace never demands `sales_order.rate_override`. Only a rate the user
 * actually edited is sent, and always at 2dp, the scale the API stores.
 *
 * `discount_pct` is clamped to `'0'` without `sales_order.discount_override`.
 * The field is hidden from those users anyway, so this only ever matters for a
 * draft that was *given* a discount by someone else (or by an older session) —
 * better a zero the server accepts than a 403 the user can do nothing about.
 */
function lineIn(line: DraftLine, canDiscount: boolean): SalesOrderLineIn {
  const discount = line.discountPct.trim() || '0';
  return {
    variant_id: line.variantId,
    qty: String(line.qty),
    rate: line.rateTouched ? Number(line.rate).toFixed(2) : null,
    discount_pct: canDiscount ? discount : '0',
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
export function toSalesOrderIn(state: DraftState, today: string, canDiscount: boolean): SalesOrderIn {
  return {
    ...commonBody(state),
    customer_id: state.customer?.id ?? '',
    order_date: today,
    order_discount_pct: canDiscount ? state.orderDiscountPct.trim() || '0' : '0',
    lines: draftLines(state).map((line) => lineIn(line, canDiscount)),
  };
}

/**
 * `PATCH /sales-orders/{id}` for a draft.
 *
 * Never `customer_id` (the order snapshots its customer — a different customer
 * is a different order) and never `order_date` (locked once the order is
 * numbered; sending it unchanged only risks a 422 for nothing). `lines` is a
 * full replace, which is what the endpoint expects.
 *
 * `order_discount_pct` is *omitted* rather than zeroed when the caller lacks
 * `sales_order.discount_override`: the server reads sending it as "the caller
 * is setting a discount", and a `'0'` would silently wipe a discount this edit
 * never touched.
 */
export function toSalesOrderPatch(state: DraftState, canDiscount: boolean): SalesOrderPatch {
  const patch: SalesOrderPatch = {
    ...commonBody(state),
    lines: draftLines(state).map((line) => lineIn(line, canDiscount)),
  };
  if (canDiscount) patch.order_discount_pct = state.orderDiscountPct.trim() || '0';
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
      if (line.snapshot.price) {
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
