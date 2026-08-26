import React from 'react';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, EmptyState } from '@/ui';

// Root-stack placeholder behind the centre tab-bar action — M2 replaces this
// with the real new-order flow (optionally seeded with a customerId).
export function NewOrderScreen() {
  const navigation = useNavigation();
  return (
    <Screen title="New order" back={() => navigation.goBack()}>
      <EmptyState icon={Plus} title="New order coming soon" hint="Order creation arrives in MVP 2." />
    </Screen>
  );
}
