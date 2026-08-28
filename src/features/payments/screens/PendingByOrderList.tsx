import React from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Wallet } from 'lucide-react-native';
import { Button, EmptyState, ErrorState, ListFooter, OfflineBanner, RowCard, StatusChip, useBottomClearance, type MetricItem } from '@/ui';
import { gapList } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import { statusLabel, statusTone } from '@/lib/sales/status';
import { usePermission } from '@/lib/permissions';
import { useOrders } from '@/features/orders/hooks';
import { PaymentsSkeleton } from '../components/PaymentsSkeleton';
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
        // Fix round 1 (finding 3): rows here carry one badge, a Value / Paid
        // / Outstanding strip and a trailing Pay button — `OrdersSkeleton`'s
        // two-chip / four-metric silhouette (the Orders register's own shape)
        // no longer matches. `PaymentsSkeleton metrics` does.
        <PaymentsSkeleton metrics />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Wallet} title="Nothing pending" hint="No open order is carrying an outstanding balance." />
      ) : (
        <FlatList
          testID="pending-by-order-list"
          contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
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
          ListFooterComponent={<ListFooter loading={isFetchingNextPage} />}
        />
      )}
    </View>
  );
}

/**
 * One open order in the `payments-by-order` frame's shape — a lifted `RowCard`
 * exactly like the Orders register's own rows, so the card skeleton above and
 * the rows that replace it are the same object. The three money figures ride
 * in the metrics strip rather than as a single trailing amount: what a rep
 * chasing a balance needs is the *gap*, and the gap is only legible next to
 * what the order is worth and what has already come in.
 *
 * "Value" is the order's `net` — not "Billed", which would claim an invoiced
 * figure the list payload does not carry.
 */
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
  const metrics: MetricItem[] = [
    { label: 'Value', value: formatMoney(order.net) },
    { label: 'Paid', value: formatMoney(order.paid_amount) },
    {
      label: 'Outstanding',
      value: formatMoney(order.outstanding),
      tone: Number(order.outstanding) > 0 ? 'danger' : undefined,
    },
  ];

  return (
    <RowCard
      onPress={onOpen}
      title={order.number}
      badges={
        <StatusChip
          tone={statusTone('payment_status', order.payment_status)}
          label={statusLabel('payment_status', order.payment_status)}
          size="sm"
        />
      }
      meta={
        order.expected_delivery_date
          ? `${order.customer_name} · due ${formatDate(order.expected_delivery_date)}`
          : order.customer_name
      }
      metrics={metrics}
      trailing={canPay ? <Button label="Pay" variant="outline" size="sm" onPress={onPay} /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: gapList },
});
