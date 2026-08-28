import React, { useMemo } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users } from 'lucide-react-native';
import { Text, EmptyState, ErrorState, OfflineBanner, Skeleton, useBottomClearance } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format/money';
import { useReceivables } from '../hooks';
import { groupReceivables } from '../filters';
import { ReceivableRow } from '../components/ReceivableRow';
import type { PaymentsNavigation } from './PaymentsTabScreen';

const RECEIVABLES_LIMIT = 200;

/**
 * "By customer" — every open invoice (`/receivables`), grouped down to one
 * row per customer. Capped at `RECEIVABLES_LIMIT` invoices (no "load more"):
 * the register this feeds is a workflow list for a rep deciding who to call
 * next, not a paginated report — the web app's own Receivables report is
 * where a company-wide, unbounded listing belongs. When the cap actually bites,
 * the header says so — the total above the list is then only the total of what
 * was fetched, not the company's.
 */
export function PendingByCustomerList() {
  const navigation = useNavigation<PaymentsNavigation>();
  const { items, total, isPending, isError, error, refetch, refresh, isRefetching, totalOutstanding, dataUpdatedAt } =
    useReceivables({}, RECEIVABLES_LIMIT);
  const groups = useMemo(() => groupReceivables(items), [items]);
  const clearance = useBottomClearance();

  const capped = items.length < total;
  const hasRows = !isPending && !isError && groups.length > 0;

  // The banner sits above *every* branch, the skeleton included. Reads keep
  // `networkMode: 'online'`, so a first load that happens offline never
  // resolves — an eternal skeleton with nothing explaining it reads as the app
  // being broken rather than as the phone having no signal.
  return (
    <View style={styles.flex}>
      <OfflineBanner dataUpdatedAt={dataUpdatedAt} />
      {hasRows ? (
        <Text variant="label" color="textMuted" style={styles.total}>
          {`Total outstanding ${formatMoney(totalOutstanding)}${capped ? ` (top ${RECEIVABLES_LIMIT} invoices)` : ''}`}
        </Text>
      ) : null}
      {isPending ? (
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
        </View>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Users} title="Nothing outstanding" hint="No customer currently owes against an open invoice." />
      ) : (
        <FlatList
          testID="pending-by-customer-list"
          contentContainerStyle={{ paddingBottom: clearance }}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  total: { marginBottom: space[2] },
  skeletonGap: { gap: space[3] },
});
