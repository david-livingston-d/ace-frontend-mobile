import React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Wallet } from 'lucide-react-native';
import { Text, Button, EmptyState, ErrorState, OfflineBanner, useBottomClearance, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format/money';
import { usePermission } from '@/lib/permissions';
import { useOrders } from '@/features/orders/hooks';
import { OrdersSkeleton } from '@/features/orders/components/OrdersSkeleton';
import type { SalesOrderListItem } from '@/lib/api/types';
import type { PaymentsNavigation } from './PaymentsTabScreen';

/** "By order" — every open order still carrying an outstanding balance
 * (`ORDER_FILTER_PRESETS.pendingPayment`: `{ open: true, outstanding_only:
 * true }`). Each row's own "Pay" action skips straight to `RecordPayment`
 * pre-tagged to that order and its customer, rather than making the rep
 * pick both again. */
export function PendingByOrderList() {
  const navigation = useNavigation<PaymentsNavigation>();
  const canPay = usePermission('payment.create');
  const clearance = useBottomClearance();
  const { items, isPending, isError, error, refetch, refresh, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching, dataUpdatedAt } =
    useOrders({ preset: 'pendingPayment' });

  // The banner sits above *every* branch, the skeleton included. Reads keep
  // `networkMode: 'online'`, so a first load that happens offline never
  // resolves — an eternal skeleton with nothing explaining it reads as the app
  // being broken rather than as the phone having no signal.
  return (
    <View style={styles.flex}>
      <OfflineBanner dataUpdatedAt={dataUpdatedAt} />
      {isPending ? (
        <OrdersSkeleton />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Wallet} title="Nothing pending" hint="No open order is carrying an outstanding balance." />
      ) : (
        <FlatList
          testID="pending-by-order-list"
          contentContainerStyle={{ paddingBottom: clearance }}
          data={items}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <OrderPaymentRow
              order={item}
              canPay={canPay}
              onOpen={() => navigation.navigate('OrderDetail', { id: item.id })}
              onPay={() => navigation.navigate('RecordPayment', { orderId: item.id, customerId: item.customer_id })}
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refresh()} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} /> : null}
        />
      )}
    </View>
  );
}

function OrderPaymentRow({
  order,
  canPay,
  onOpen,
  onPay,
}: {
  order: SalesOrderListItem;
  canPay: boolean;
  onOpen: () => void;
  onPay: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <Pressable style={styles.main} onPress={onOpen} accessibilityRole="button">
        <Text variant="body" numberOfLines={1}>{order.number}</Text>
        <Text variant="bodySm" color="textMuted" numberOfLines={1}>
          {`${order.customer_name} · ${formatMoney(order.outstanding)}`}
        </Text>
      </Pressable>
      {canPay ? <Button label="Pay" variant="outline" onPress={onPay} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space[2],
  },
  main: { flex: 1, gap: space[1] },
  footerSpinner: { paddingVertical: space[4] },
});
