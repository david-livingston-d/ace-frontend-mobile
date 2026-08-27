import React, { useState } from 'react';
import { FlatList, Linking, Pressable, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClipboardList, Phone, Wallet } from 'lucide-react-native';
import { Screen, Card, Text, Chip, StatusChip, Button, EmptyState, ErrorState, Skeleton, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format/money';
import { cmpMoney } from '@/lib/sales/calc';
import { useMe } from '@/features/auth/hooks';
import { hasPermission, usePermission } from '@/lib/permissions';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { useCustomerTypes } from '@/features/masters/hooks';
import { OrderRow } from '@/features/orders/components/OrderRow';
import { usePayments, useReceivables } from '@/features/payments/hooks';
import { PaymentRow } from '@/features/payments/components/PaymentRow';
import type { RootStackParamList } from '@/navigation/types';
import { useCustomer, useCustomerFinancialSummary } from '../hooks';
import { FinancialSummary } from '../components/FinancialSummary';
import type { SalesOrderListItem } from '@/lib/api/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerDetail'>;
type DetailTab = 'orders' | 'payments';

export function CustomerDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerDetail'>>();
  const { id } = route.params;
  const theme = useTheme();

  const { data: me } = useMe();
  const { data: customer, isPending, isError, error, refetch } = useCustomer(id);
  const { data: customerTypes } = useCustomerTypes();
  const canSeeSummary = usePermission('payment.read');
  const { data: summary } = useCustomerFinancialSummary(id, canSeeSummary);
  const [tab, setTab] = useState<DetailTab>('orders');

  const orders = useInfiniteList<SalesOrderListItem>({
    path: '/sales-orders',
    params: { customer_id: id },
    enabled: tab === 'orders',
  });
  const payments = usePayments({ customer_id: id }, 20, tab === 'payments');
  // A second, narrower read of the same money the header's `FinancialSummary`
  // already shows — this one straight off `/receivables`, the same figure
  // the Payments tab's "By customer" view sums. Only fetched behind
  // `payment.read` (`canSeeSummary`), same gate as the header card.
  const receivables = useReceivables({ customer_id: id }, 50, tab === 'payments' && canSeeSummary);

  function can(code: string) {
    return hasPermission(me, code);
  }

  if (isPending) {
    return (
      <Screen title="Customer" back={() => navigation.goBack()}>
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={110} />
          <Skeleton width="100%" height={140} />
        </View>
      </Screen>
    );
  }

  if (isError || !customer) {
    return (
      <Screen title="Customer" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const typeName = customerTypes?.find((t) => t.id === customer.customer_type_id)?.name;
  const primaryContact = customer.contacts.find((c) => c.is_primary) ?? customer.contacts[0];
  const primaryCity = customer.addresses[0]?.city;

  return (
    <Screen title={customer.name} back={() => navigation.goBack()} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.flex}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text variant="h3" style={styles.headerName}>{customer.name}</Text>
            {typeName ? <StatusChip tone="neutral" label={typeName} /> : null}
          </View>
          {primaryContact?.mobile ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${primaryContact.mobile}`)}
              accessibilityRole="button"
              style={styles.phoneRow}
            >
              <Phone size={16} color={theme.colors.textSubtle} />
              <Text variant="bodySm" color="textMuted">{primaryContact.mobile}</Text>
            </Pressable>
          ) : null}
          {primaryCity ? (
            <Text variant="bodySm" color="textMuted">{primaryCity}</Text>
          ) : null}
        </Card>

        {canSeeSummary && summary ? <FinancialSummary summary={summary} /> : null}

        <View style={styles.tabsRow}>
          <Chip label="Orders" selected={tab === 'orders'} onPress={() => setTab('orders')} />
          <Chip label="Payments" selected={tab === 'payments'} onPress={() => setTab('payments')} />
        </View>

        <View style={styles.tabBody}>
          {tab === 'orders' ? (
            orders.isPending ? (
              <Skeleton width="100%" height={72} />
            ) : orders.isError ? (
              <ErrorState message={getErrorMessage(orders.error)} onRetry={() => orders.refetch()} />
            ) : orders.items.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No orders yet" hint="This customer has no orders on record." />
            ) : (
              <FlatList
                data={orders.items}
                keyExtractor={(o) => o.id}
                renderItem={({ item }) => (
                  <OrderRow order={item} onPress={() => navigation.navigate('OrderDetail', { id: item.id })} />
                )}
                onEndReachedThreshold={0.4}
                onEndReached={() => {
                  if (orders.hasNextPage) orders.fetchNextPage();
                }}
              />
            )
          ) : payments.isPending ? (
            <Skeleton width="100%" height={72} />
          ) : payments.isError ? (
            <ErrorState message={getErrorMessage(payments.error)} onRetry={() => payments.refetch()} />
          ) : payments.items.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" hint="Nothing has been recorded for this customer." />
          ) : (
            <View style={styles.flex}>
              {canSeeSummary && receivables.data ? (
                <Text variant="label" color="textMuted" style={styles.receivablesLine}>
                  {`Outstanding ${formatMoney(receivables.totalOutstanding)}`}
                </Text>
              ) : null}
              <FlatList
                data={payments.items}
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => (
                  <PaymentRow
                    number={item.number}
                    paymentMode={item.payment_mode_name}
                    amount={item.amount}
                    paymentDate={item.payment_date}
                    status={item.status}
                    trailing={cmpMoney(item.unallocated, '0') > 0 ? item.unallocated : undefined}
                    onPress={() => navigation.navigate('PaymentDetail', { id: item.id })}
                  />
                )}
                onEndReachedThreshold={0.4}
                onEndReached={() => {
                  if (payments.hasNextPage) payments.fetchNextPage();
                }}
              />
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {can('sales_order.create') ? (
            <Button
              label="New order for this customer"
              fullWidth
              onPress={() => navigation.navigate('NewOrder', { customerId: id })}
            />
          ) : null}
          {can('payment.create') ? (
            <Button
              label="Record payment"
              variant="outline"
              fullWidth
              onPress={() => navigation.navigate('RecordPayment', { customerId: id })}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skeletonGap: { gap: space[3] },
  headerCard: { marginBottom: space[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  headerName: { flexShrink: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  tabsRow: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  tabBody: { flex: 1, marginTop: space[3] },
  receivablesLine: { marginBottom: space[2] },
  actions: { gap: space[2], paddingTop: space[2] },
});
