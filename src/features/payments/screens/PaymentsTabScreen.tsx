import React from 'react';
import { Wallet } from 'lucide-react-native';
import { Screen, EmptyState } from '@/ui';

// Placeholder for M1 — M3 replaces this with real payment recording/receivables.
export function PaymentsTabScreen() {
  return (
    <Screen title="Payments">
      <EmptyState icon={Wallet} title="Payments coming soon" hint="Payment recording arrives in a later milestone." />
    </Screen>
  );
}
