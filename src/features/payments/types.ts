import type { Schemas } from '@/lib/api/types';

export type PaymentDetail = Schemas['PaymentDetailOut'];
export type PaymentAllocation = Schemas['PaymentAllocationOut'];
export type PaymentWarning = Schemas['PaymentWarningOut'];
export type PaymentListItem = Schemas['PaymentListItemOut'];
export type PaymentIn = Schemas['PaymentIn'];
export type AllocationsIn = Schemas['AllocationsIn'];
export type SuggestAllocation = Schemas['SuggestAllocationOut'];
export type SuggestedAllocation = Schemas['SuggestedAllocationOut'];
export type ReceivableRow = Schemas['ReceivableRowOut'];
export type ReceivablesOut = Schemas['ReceivablesOut'];
export type PaymentMode = Schemas['PaymentModeOut'];

/** What a payment is being recorded *against* — the one choice that decides
 * whether the wire body carries `sales_order_id`, and whether the rep is
 * offered an allocation step afterwards. `'invoice'` is still an order-tagged
 * payment; it only differs in that the allocation screen opens focused on the
 * invoice the rep came from. */
export type PaymentAgainst = 'order' | 'customer' | 'invoice';
