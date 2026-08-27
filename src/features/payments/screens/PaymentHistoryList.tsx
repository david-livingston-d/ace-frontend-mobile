import React, { useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Receipt, SlidersHorizontal } from 'lucide-react-native';
import { SearchBar, IconButton, EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { cmpMoney } from '@/lib/sales/calc';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { usePaymentFilters } from '@/store/filters';
import { ActiveFilterChips } from '@/features/orders/components/ActiveFilterChips';
import { usePayments } from '../hooks';
import { paymentFiltersToParams } from '../filters';
import { PaymentRow } from '../components/PaymentRow';
import { PaymentFilterSheet, type PaymentFilterSheetHandle } from '../components/PaymentFilterSheet';
import type { PaymentsNavigation } from './PaymentsTabScreen';

/** "History" — the company-wide payments register (accepted: payments carry
 * no sales scope, so even the executive sees every rep's payments here). */
export function PaymentHistoryList() {
  const navigation = useNavigation<PaymentsNavigation>();
  const filters = usePaymentFilters((s) => s.filters);
  const setFilters = usePaymentFilters((s) => s.set);
  const resetFilters = usePaymentFilters((s) => s.reset);
  const chipsFor = usePaymentFilters((s) => s.chipsFor);
  const clearChip = usePaymentFilters((s) => s.clearChip);
  const sheetRef = useRef<PaymentFilterSheetHandle>(null);

  // Same debounce-before-request rule as `useOrders` — every keystroke in the
  // search box would otherwise fire its own `/payments?q=...` call.
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const params = useMemo(() => paymentFiltersToParams({ ...filters, q: debouncedQ }), [filters, debouncedQ]);
  const { items, isPending, isError, error, refetch, refresh, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching, dataUpdatedAt } =
    usePayments(params);

  const chips = chipsFor(filters);

  return (
    <View style={styles.flex}>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <SearchBar value={filters.q ?? ''} onChangeText={(q) => setFilters({ q })} placeholder="Search payment or customer" />
        </View>
        <IconButton icon={SlidersHorizontal} label="Filters" onPress={() => sheetRef.current?.open()} />
      </View>
      <ActiveFilterChips chips={chips} onClear={clearChip} />
      <OfflineBanner dataUpdatedAt={dataUpdatedAt} />

      {isPending ? (
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={56} />
          <Skeleton width="100%" height={56} />
          <Skeleton width="100%" height={56} />
        </View>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments match"
          hint="Try a different search, or clear your filters."
          action={{ label: 'Clear filters', onPress: resetFilters }}
        />
      ) : (
        <FlatList
          testID="payment-history-list"
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PaymentRow
              number={item.number}
              paymentMode={item.payment_mode_name}
              amount={item.amount}
              paymentDate={item.payment_date}
              customerName={item.customer_name}
              status={item.status}
              trailing={cmpMoney(item.unallocated, '0') > 0 ? item.unallocated : undefined}
              onPress={() => navigation.navigate('PaymentDetail', { id: item.id })}
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refresh()} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} /> : null}
        />
      )}

      <PaymentFilterSheet ref={sheetRef} filters={filters} onApply={setFilters} onReset={resetFilters} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  searchField: { flex: 1 },
  skeletonGap: { gap: space[3], marginTop: space[2] },
  footerSpinner: { paddingVertical: space[4] },
});
