import React from 'react';
import { LayoutDashboard } from 'lucide-react-native';
import { Screen, EmptyState } from '@/ui';

// Placeholder for M1 — Task 6 replaces this with the real sales dashboard.
export function HomeScreen() {
  return (
    <Screen title="Home">
      <EmptyState icon={LayoutDashboard} title="Dashboard coming soon" hint="Your day-at-a-glance view lands in a later task." />
    </Screen>
  );
}
