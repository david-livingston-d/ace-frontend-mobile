import type { TabName } from './tabs';

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

export type TabParamList = Record<TabName, undefined>;
