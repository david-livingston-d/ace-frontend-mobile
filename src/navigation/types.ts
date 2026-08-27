import type { TabName } from './tabs';
import type { OrderPreset } from '@/features/orders/filters';

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  Splash: undefined;
  ForceUpdate: undefined;
  OrderDetail: { id: string };
  OrderTimeline: { id: string };
  CustomerSearch: { onPick?: 'order' } | undefined;
  CustomerCreate: { returnTo: 'order' | 'detail' };
  CustomerDetail: { id: string };
  // The product browse + multi-variant picker (M2 Task 4) — a root-stack route
  // of its own so Task 5's order-create wizard can nest it without owning the
  // navigator; no params yet (the wizard's own draft context supplies scope).
  ProductBrowse: undefined;
  PaymentDetail: { id: string };
  DeliveryNoteDetail: { id: string };
  RecordDelivery: { orderId: string };
  RecordPayment: { orderId: string };
  // The three ways into the order wizard, all resolved by `NewOrderScreen`:
  // `customerId` pre-seeds the customer but stays on step 1 (a customer's
  // detail page raising an order for them), `pickedCustomerId` is the customer
  // search/create screens handing back their result and forwards to products,
  // and `editOrderId` rebuilds the whole draft from a saved order and forwards
  // to the cart. No params at all — the tab bar's "+" — is a plain new order.
  NewOrder: { customerId?: string; editOrderId?: string; pickedCustomerId?: string } | undefined;
};

// `Orders` alone carries params (Home's KPI tiles / due strip navigate into it
// pre-filtered by preset, optionally with a date range); every other tab stays
// a plain unparented route.
export type TabParamList = Omit<Record<TabName, undefined>, 'Orders'> & {
  Orders: { preset?: OrderPreset; dateFrom?: string; dateTo?: string } | undefined;
};
