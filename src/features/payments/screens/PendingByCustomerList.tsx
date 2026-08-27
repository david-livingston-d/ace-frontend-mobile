import React, { useMemo } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users } from 'lucide-react-native';
import { Text, EmptyState, ErrorState, Skeleton } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format/money';
import { useReceivables } from '../hooks';
import { groupReceivables } from '../filters';
import { ReceivableRow } from '../components/ReceivableRow';
import type { PaymentsNavigation } from './PaymentsTabScreen';

/**
 * "By customer" — every open invoice (`/receivables`), grouped down to one
 * row per customer. Capped at 200 rows (`limit: 200`, no "load more"): the
 * register this feeds is a workflow list for a rep deciding who to call
 * next, not a paginated report — the web app's own Receivables report is
 * where a company-wide, unbounded listing belongs.
 */
export function PendingByCustomerList() {
  const navigation = useNavigation<PaymentsNavigation>();
  const { items, isPending, isError, error, refetch, refresh, isRefetching, totalOutstanding } = useReceivables({}, 200);
  const groups = useMemo(() => groupReceivables(items), [items]);

  if (isPending) {
    return (
      <View style={styles.skeletonGap}>
        <Skeleton width="100%" height={64} />
        <Skeleton width="100%" height={64} />
        <Skeleton width="100%" height={64} />
      </View>
    );
  }
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (groups.length === 0) {
    return <EmptyState icon={Users} title="Nothing outstanding" hint="No customer currently owes against an open invoice." />;
  }

  return (
    <View style={styles.flex}>
      <Text variant="label" color="textMuted" style={styles.total}>
        {`Total outstanding ${formatMoney(totalOutstanding)}`}
      </Text>
      <FlatList
        testID="pending-by-customer-list"
        data={groups}
        keyExtractor={(g) => g.customer_id}
        renderItem={({ item }) => (
          <ReceivableRow
            customerName={item.customer_name}
            outstanding={item.outstanding}
            overdue={item.overdue}
            invoices={item.invoices}
            onPress={() => navigation.navigate('CustomerDetail', { id: item.customer_id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refresh()} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  total: { marginBottom: space[2] },
  skeletonGap: { gap: space[3] },
});
