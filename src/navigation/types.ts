import type { TabName } from './tabs';
import type { OrderPreset } from '@/features/orders/filters';

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  Splash: undefined;
  ForceUpdate: undefined;
  OrderDetail: { id: string };
  OrderTimeline: { id: string };
  CustomerDetail: { id: string };
  PaymentDetail: { id: string };
  DeliveryNoteDetail: { id: string };
  RecordDelivery: { orderId: string };
  RecordPayment: { orderId: string };
  // `editOrderId` is Task 5's real edit flow — declared now so order detail's
  // Edit action can navigate here today; the placeholder screen ignores it.
  NewOrder: { customerId?: string; editOrderId?: string } | undefined;
};

// `Orders` alone carries params (Home's KPI tiles / due strip navigate into it
// pre-filtered by preset, optionally with a date range); every other tab stays
// a plain unparented route.
export type TabParamList = Omit<Record<TabName, undefined>, 'Orders'> & {
  Orders: { preset?: OrderPreset; dateFrom?: string; dateTo?: string } | undefined;
};
