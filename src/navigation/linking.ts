import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['acesales://'],
  config: {
    screens: {
      OrderDetail: 'orders/:id',
      OrderTimeline: 'orders/:id/timeline',
      CustomerDetail: 'customers/:id',
      PaymentDetail: 'payments/:id',
      DeliveryNoteDetail: 'delivery-notes/:id',
      Tabs: { screens: { Home: 'home', Orders: 'orders', Payments: 'payments', More: 'more' } },
    },
  },
};
