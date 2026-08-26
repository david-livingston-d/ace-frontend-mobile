import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['acesales://'],
  config: {
    screens: {
      // These detail screens don't exist yet — they're registered in M2/M3. Until
      // then, an incoming link to one of these routes falls back to the
      // navigator's first stack screen rather than a blank screen (React
      // Navigation's standard behavior for a path with no matching route).
      OrderDetail: 'orders/:id',
      OrderTimeline: 'orders/:id/timeline',
      CustomerSearch: 'customers/search',
      CustomerCreate: 'customers/new',
      CustomerDetail: 'customers/:id',
      PaymentDetail: 'payments/:id',
      DeliveryNoteDetail: 'delivery-notes/:id',
      Tabs: { screens: { Home: 'home', Orders: 'orders', Payments: 'payments', More: 'more' } },
    },
  },
};
