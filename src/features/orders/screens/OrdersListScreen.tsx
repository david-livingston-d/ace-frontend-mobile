import React from 'react';
import { ClipboardList } from 'lucide-react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen, EmptyState } from '@/ui';
import type { TabParamList } from '@/navigation/types';

// Placeholder for M1 — M2 (mobile order flows) replaces this with the real list.
// Reads the `preset` Home's KPI tiles/due strip navigate in with, so the
// hand-off is visible even before the real filtered register exists.
export function OrdersListScreen() {
  const route = useRoute<RouteProp<TabParamList, 'Orders'>>();
  const preset = route.params?.preset;
  return (
    <Screen title="Orders">
      <EmptyState
        icon={ClipboardList}
        title="Orders coming soon"
        hint={preset ? `Order creation and tracking arrive in MVP 2. Requested filter: ${preset}` : 'Order creation and tracking arrive in MVP 2.'}
      />
    </Screen>
  );
}
