import type { TabName } from './tabs';
import type { OrderPreset } from '@/features/orders/filters';

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  Splash: undefined;
  ForceUpdate: undefined;
  OrderDetail: { id: string };
  OrderTimeline: { id: string };
  // `onPick` is what the picker does with the row that was tapped: hand it
  // back to the order wizard, hand it to the payment form, or (unset) simply
  // open the customer's own page.
  CustomerSearch: { onPick?: 'order' | 'payment' } | undefined;
  CustomerCreate: { returnTo: 'order' | 'detail' | 'payment' };
  CustomerDetail: { id: string };
  // The product browse + multi-variant picker (M2 Task 4) — a root-stack route
  // of its own so Task 5's order-create wizard can nest it without owning the
  // navigator; no params yet (the wizard's own draft context supplies scope).
  ProductBrowse: undefined;
  PaymentDetail: { id: string };
  // The allocation step of a payment: which payment, and (when the rep came
  // from a specific invoice's "Pay" action) the row to open focused on.
  Allocation: { paymentId: string; invoiceId?: string };
  DeliveryNoteDetail: { id: string };
  RecordDelivery: { orderId: string };
  // The More tab's two static-content rows (M3-T5) — no params, root-stack
  // routes (not tabs) so they get the plain back-button header/animation.
  About: undefined;
  Privacy: undefined;
  // All three params are optional and independent: from an order (the order
  // and its customer), from a customer (no order to tag), from an invoice's
  // "Pay" action (all three), or from nowhere at all — the payments tab's
  // "Record payment", which picks the customer inside the screen.
  RecordPayment: { orderId?: string; customerId?: string; invoiceId?: string } | undefined;
  // The three ways into the order wizard, all resolved by `NewOrderScreen`:
  // `customerId` pre-seeds the customer but stays on step 1 (a customer's
  // detail page raising an order for them), `pickedCustomerId` is the customer
  // search/create screens handing back their result and forwards to products,
  // and `editOrderId` rebuilds the whole draft from a saved order and forwards
  // to the cart. No params at all — the tab bar's "+" — is a plain new order.
  NewOrder: { customerId?: string; editOrderId?: string; pickedCustomerId?: string } | undefined;
};

// `Orders` and `Payments` carry params (Home's KPI tiles / due strip / the
// dashboard's OUTSTANDING card navigate into them pre-selected); every other
// tab stays a plain unparented route.
export type TabParamList = Omit<Record<TabName, undefined>, 'Orders' | 'Payments'> & {
  Orders: { preset?: OrderPreset; dateFrom?: string; dateTo?: string } | undefined;
  // Which of the three chips (By order / By customer / History) the
  // Payments tab opens on — consumed once per focus, same pattern as
  // `Orders`' own `preset`/`dateFrom`/`dateTo` above.
  Payments: { view?: 'orders' | 'customers' | 'history' } | undefined;
};
