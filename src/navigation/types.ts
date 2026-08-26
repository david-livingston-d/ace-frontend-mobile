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
  NewOrder: { customerId?: string } | undefined;
};

// `Orders` alone carries params (Home's KPI tiles / due strip navigate into it
// pre-filtered by preset, optionally with a date range); every other tab stays
// a plain unparented route.
export type TabParamList = Omit<Record<TabName, undefined>, 'Orders'> & {
  Orders: { preset?: OrderPreset; dateFrom?: string; dateTo?: string } | undefined;
};
