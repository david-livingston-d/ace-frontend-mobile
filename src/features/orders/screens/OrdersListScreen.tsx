import React from 'react';
import { ClipboardList } from 'lucide-react-native';
import { Screen, EmptyState } from '@/ui';

// Placeholder for M1 — M2 (mobile order flows) replaces this with the real list.
export function OrdersListScreen() {
  return (
    <Screen title="Orders">
      <EmptyState icon={ClipboardList} title="Orders coming soon" hint="Order creation and tracking arrive in MVP 2." />
    </Screen>
  );
}
