import React, { useState } from 'react';
import { FlatList, Linking, Pressable, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClipboardList, Phone, Wallet } from 'lucide-react-native';
import { Avatar, Button, Card, Divider, EmptyState, ErrorState, Screen, SegmentedControl, Skeleton, StatusChip, Text, useTheme } from '@/ui';
import { gapList, gutter, space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format/money';
import { formatAddress } from '@/lib/customers/address';
import { cmpMoney } from '@/lib/sales/calc';
import { useMe } from '@/features/auth/hooks';
import { hasPermission, usePermission } from '@/lib/permissions';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { useCustomerTypes, usePaymentTerms } from '@/features/masters/hooks';
import { OrderRow } from '@/features/orders/components/OrderRow';
import { usePayments, useReceivables } from '@/features/payments/hooks';
import { PaymentRow } from '@/features/payments/components/PaymentRow';
import type { RootStackParamList } from '@/navigation/types';
import { useCustomer, useCustomerFinancialSummary } from '../hooks';
import { FinancialSummary } from '../components/FinancialSummary';
import type { SalesOrderListItem } from '@/lib/api/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerDetail'>;
type DetailTab = 'orders' | 'payments';

const TABS = [
  { value: 'orders', label: 'Orders' },
  { value: 'payments', label: 'Payments' },
];

/** The `customer-detail` frame: an identity card, the money tiles behind
 * `payment.read`, then Orders / Payments as one segmented control over the
 * list, with the two write actions pinned at the bottom. */
export function CustomerDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerDetail'>>();
  const { id } = route.params;
  const theme = useTheme();

  const { data: me } = useMe();
  const { data: customer, isPending, isError, error, refetch } = useCustomer(id);
  const { data: customerTypes } = useCustomerTypes();
  const { data: paymentTerms } = usePaymentTerms();
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
          <Skeleton width="100%" height={130} radius={radius.lg} />
          <Skeleton width="100%" height={96} radius={radius.lg} />
          <Skeleton width="100%" height={76} radius={radius.lg} />
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
  const termsName = paymentTerms?.find((t) => t.id === customer.payment_terms_id)?.name;
  const primaryContact = customer.contacts.find((c) => c.is_primary) ?? customer.contacts[0];
  const primaryAddress = customer.addresses[0];

  return (
    <Screen
      title={customer.name}
      back={() => navigation.goBack()}
      // Stacked rather than the frame's side-by-side pair: this screen's own
      // copy ("New order for this customer") is longer than the frame's "New
      // order", and the button role is uppercase *and* letter-spaced — split
      // across a row both labels wrapped to two lines.
      footer={
        <View style={styles.actions}>
          {can('payment.create') ? (
            <Button
              label="Record payment"
              variant="outline"
              fullWidth
              onPress={() => navigation.navigate('RecordPayment', { customerId: id })}
            />
          ) : null}
          {can('sales_order.create') ? (
            <Button
              label="New order for this customer"
              fullWidth
              onPress={() => navigation.navigate('NewOrder', { customerId: id })}
            />
          ) : null}
        </View>
      }
    >
      <View style={styles.flex}>
        <Card>
          <View style={styles.headRow}>
            <Avatar name={customer.name} />
            <View style={styles.headText}>
              <Text variant="cardTitle" numberOfLines={2}>{customer.name}</Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {[customer.code, termsName].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {typeName ? <StatusChip tone="neutral" label={typeName} size="sm" /> : null}
          </View>

          <Divider style={styles.divider} />

          {customer.gstin ? <Text variant="caption" color="muted">{customer.gstin}</Text> : null}
          {primaryContact?.mobile ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${primaryContact.mobile}`)}
              accessibilityRole="button"
              style={styles.phoneRow}
            >
              <Phone size={14} color={theme.colors.subtle} />
              <Text variant="caption" color="muted">{primaryContact.mobile}</Text>
            </Pressable>
          ) : null}
          {primaryAddress ? (
            <Text variant="caption" color="muted" style={styles.addressLine}>{formatAddress(primaryAddress)}</Text>
          ) : null}
        </Card>

        {canSeeSummary && summary ? <FinancialSummary summary={summary} /> : null}

        <View style={styles.tabsRow}>
          <SegmentedControl options={TABS} value={tab} onChange={(value) => setTab(value as DetailTab)} />
        </View>

        <View style={styles.tabBody}>
          {tab === 'orders' ? (
            orders.isPending ? (
              <Skeleton width="100%" height={112} radius={radius.lg} />
            ) : orders.isError ? (
              <ErrorState message={getErrorMessage(orders.error)} onRetry={() => orders.refetch()} />
            ) : orders.items.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No orders yet" hint="This customer has no orders on record." />
            ) : (
              <FlatList
                data={orders.items}
                keyExtractor={(o) => o.id}
                contentContainerStyle={styles.list}
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
            <Skeleton width="100%" height={76} radius={radius.lg} />
          ) : payments.isError ? (
            <ErrorState message={getErrorMessage(payments.error)} onRetry={() => payments.refetch()} />
          ) : payments.items.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" hint="Nothing has been recorded for this customer." />
          ) : (
            <View style={styles.flex}>
              {canSeeSummary && receivables.data ? (
                <Text variant="label" color="muted" style={styles.receivablesLine}>
                  {`Outstanding ${formatMoney(receivables.totalOutstanding)}`}
                </Text>
              ) : null}
              <FlatList
                data={payments.items}
                keyExtractor={(p) => p.id}
                contentContainerStyle={styles.list}
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skeletonGap: { gap: space[3] },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  headText: { flex: 1, gap: space[1] - 2 },
  divider: { marginVertical: space[3] },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[1] },
  addressLine: { marginTop: space[1] },
  tabsRow: { marginTop: space[4] },
  tabBody: { flex: 1, marginTop: space[3] },
  list: { gap: gapList, paddingBottom: space[3] },
  receivablesLine: { marginBottom: space[2] },
  // `Screen`'s footer slot sits outside the body gutter, so it re-applies it.
  actions: { gap: space[2], paddingHorizontal: gutter, paddingBottom: space[2] },
});
