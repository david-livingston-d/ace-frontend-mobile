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
  // `editOrderId` is Task 5's real edit flow — declared now so order detail's
  // Edit action can navigate here today; the placeholder screen ignores it.
  // `pickedCustomerId` is Task 3's "pick a customer for this order" result —
  // `CustomerSearchScreen`/`CustomerCreateScreen` land here with it (rather than
  // through a shared draft store, which only arrives in Task 5); this task's
  // placeholder `NewOrderScreen` ignores it too, same as `editOrderId` today.
  NewOrder: { customerId?: string; editOrderId?: string; pickedCustomerId?: string } | undefined;
};

// `Orders` alone carries params (Home's KPI tiles / due strip navigate into it
// pre-filtered by preset, optionally with a date range); every other tab stays
// a plain unparented route.
export type TabParamList = Omit<Record<TabName, undefined>, 'Orders'> & {
  Orders: { preset?: OrderPreset; dateFrom?: string; dateTo?: string } | undefined;
};
