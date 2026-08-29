import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { Screen, SegmentedControl, IconButton } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { usePermission } from '@/lib/permissions';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { PendingByOrderList } from './PendingByOrderList';
import { PendingByCustomerList } from './PendingByCustomerList';
import { PaymentHistoryList } from './PaymentHistoryList';

// This screen lives in the tab navigator but its rows/actions drill into the
// root stack — a plain `NavigationProp<TabParamList>` has no such routes, so
// the type is widened with just the cross-navigator routes the three views
// (and their rows) need. Exported so the three view components share it
// rather than each widening their own.
export type PaymentsNavigation = NavigationProp<
  TabParamList & Pick<RootStackParamList, 'OrderDetail' | 'RecordPayment' | 'CustomerDetail' | 'PaymentDetail'>
>;

type PaymentsView = 'orders' | 'customers' | 'history';

const VIEWS = [
  { value: 'orders', label: 'By order' },
  { value: 'customers', label: 'By customer' },
  { value: 'history', label: 'History' },
];

/**
 * Mockup G3/G5 (`payments-by-order` / `payments-by-customer` /
 * `payments-history` frames) — the Payments tab, three segmented views over
 * the same
 * money the PRD tracks separately from delivery: what's owed per order,
 * what's owed per customer, and the payments register itself.
 *
 * `route.params.view` (Home's OUTSTANDING tile navigates in with
 * `{ view: 'customers' }`) selects the initial chip and is then cleared —
 * same one-shot-consume-then-clear pattern as `OrdersListScreen`'s own
 * `preset` param (see that screen's comment for why the effect is keyed on
 * the primitive `paramView`, not `route.params` itself: `setParams` always
 * hands back a new object, and keying on the object re-triggers forever).
 */
export function PaymentsTabScreen() {
  const navigation = useNavigation<PaymentsNavigation>();
  const route = useRoute<RouteProp<TabParamList, 'Payments'>>();
  const [view, setView] = useState<PaymentsView>('orders');
  const canRecordPayment = usePermission('payment.create');

  const paramView = route.params?.view;
  useFocusEffect(
    useCallback(() => {
      if (paramView === undefined) return;
      setView(paramView);
      navigation.setParams({ view: undefined });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramView]),
  );

  return (
    <Screen
      title="Payments"
      right={
        canRecordPayment ? (
          <IconButton icon={Plus} label="Record payment" onPress={() => navigation.navigate('RecordPayment', {})} />
        ) : null
      }
    >
      {/* One control, not three chips: the three views are exclusive
          alternatives over the same money, which is exactly what a segmented
          control says and a chip row does not. */}
      <View style={styles.segment}>
        <SegmentedControl
          options={VIEWS}
          value={view}
          onChange={(v) => setView(v as PaymentsView)}
        />
      </View>
      <View style={styles.body}>
        {view === 'orders' ? <PendingByOrderList /> : view === 'customers' ? <PendingByCustomerList /> : <PaymentHistoryList />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { marginBottom: space[3] },
  body: { flex: 1 },
});
