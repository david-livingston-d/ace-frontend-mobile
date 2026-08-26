import React, { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { ClipboardList, SlidersHorizontal } from 'lucide-react-native';
import { Screen, SearchBar, IconButton, EmptyState, ErrorState } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { useScope } from '@/lib/permissions';
import { useOrderFilters } from '@/store/filters';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useOrders } from '../hooks';
import { OrderRow } from '../components/OrderRow';
import { FilterSheet, type FilterSheetHandle } from '../components/FilterSheet';
import { ActiveFilterChips } from '../components/ActiveFilterChips';
import { OrdersSkeleton } from '../components/OrdersSkeleton';

// This screen lives in the tab navigator but its rows drill into the root
// stack's `OrderDetail` — a plain `NavigationProp<TabParamList>` has no such
// route, so the type is widened with just the one cross-navigator route needed.
type OrdersNavigation = NavigationProp<TabParamList & Pick<RootStackParamList, 'OrderDetail'>>;

export function OrdersListScreen() {
  const navigation = useNavigation<OrdersNavigation>();
  const route = useRoute<RouteProp<TabParamList, 'Orders'>>();
  const filters = useOrderFilters((s) => s.filters);
  const setFilters = useOrderFilters((s) => s.set);
  const resetFilters = useOrderFilters((s) => s.reset);
  const chipsFor = useOrderFilters((s) => s.chipsFor);
  const clearChip = useOrderFilters((s) => s.clearChip);
  const showSalesUser = useScope('sales_order.read') !== 'own';
  // `FilterSheet` stays mounted for the screen's whole lifetime (see its own
  // comment) — the icon button presents it imperatively, like `Select`'s sheet.
  const filterSheetRef = useRef<FilterSheetHandle>(null);

  // Home's KPI tiles / due strip / "View all" navigate into this tab with a
  // preset (and optionally a date range) via route params — consumed once per
  // focus, written into the shared filter store, then cleared from the route
  // so switching tabs and back doesn't replay a stale preset.
  //
  // Keyed on the primitive param fields rather than `route.params` itself:
  // `navigation.setParams(...)` always hands back a brand-new params object
  // (verified in `@react-navigation/routers`' `BaseRouter`), so keying on the
  // object identity re-runs this effect every time it clears the very params
  // it just consumed — `setFilters` wipes the preset it just set, `setParams`
  // fires again, and `useOrders` refetches forever. Primitive deps only change
  // when an incoming navigation actually carries a new value.
  const paramPreset = route.params?.preset;
  const paramDateFrom = route.params?.dateFrom;
  const paramDateTo = route.params?.dateTo;
  useFocusEffect(
    useCallback(() => {
      if (paramPreset === undefined && paramDateFrom === undefined && paramDateTo === undefined) return;
      const patch: { preset?: typeof paramPreset; dateFrom?: string; dateTo?: string } = {};
      const clear: { preset?: undefined; dateFrom?: undefined; dateTo?: undefined } = {};
      if (paramPreset !== undefined) { patch.preset = paramPreset; clear.preset = undefined; }
      if (paramDateFrom !== undefined) { patch.dateFrom = paramDateFrom; clear.dateFrom = undefined; }
      if (paramDateTo !== undefined) { patch.dateTo = paramDateTo; clear.dateTo = undefined; }
      // Write the store before clearing the route — clearing first would let a
      // re-render in between observe neither the params nor the applied filter.
      setFilters(patch);
      navigation.setParams(clear);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramPreset, paramDateFrom, paramDateTo]),
  );

  const { items, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } =
    useOrders(filters);

  const chips = chipsFor(filters);

  function openOrder(id: string) {
    navigation.navigate('OrderDetail', { id });
  }

  return (
    <Screen title="Orders">
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <SearchBar value={filters.q ?? ''} onChangeText={(q) => setFilters({ q })} placeholder="Search client or order #" />
        </View>
        <IconButton icon={SlidersHorizontal} label="Filters" onPress={() => filterSheetRef.current?.open()} />
      </View>
      <ActiveFilterChips chips={chips} onClear={clearChip} />

      {isPending ? (
        <OrdersSkeleton />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders match"
          hint="Try a different search, or clear your filters."
          action={{ label: 'Clear filters', onPress: resetFilters }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <OrderRow order={item} showSalesUser={showSalesUser} onPress={() => openOrder(item.id)} />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} /> : null}
        />
      )}

      <FilterSheet ref={filterSheetRef} filters={filters} onApply={setFilters} onReset={resetFilters} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  searchField: { flex: 1 },
  footerSpinner: { paddingVertical: space[4] },
});
