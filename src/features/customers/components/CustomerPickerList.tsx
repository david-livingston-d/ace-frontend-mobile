import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { Plus, Users } from 'lucide-react-native';
import { Button, EmptyState, ErrorState, ListFooter, OfflineBanner, SearchBar, Skeleton } from '@/ui';
import { gapList, space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { getErrorMessage } from '@/lib/api/errors';
import { useCustomers } from '../hooks';
import { useCustomerTypes } from '@/features/masters/hooks';
import { CustomerRow } from './CustomerRow';
import type { CustomerOut } from '../types';

export type CustomerPickerListProps = {
  onPick: (customer: CustomerOut) => void;
  onCreateNew: () => void;
  /** Rendered above the search box — the wizard's `StepHeader`, or nothing. */
  header?: React.ReactNode;
};

/** A row card's own height, so the placeholders sit exactly where the rows
 * land rather than snapping the list up as they arrive. */
const ROW_HEIGHT = 76;

/**
 * The searchable customer register, shared by the standalone `CustomerSearch`
 * route and by the order wizard's customer step — one list, one debounce, one
 * empty state, so "pick a customer" reads identically wherever it happens
 * (`customer-picker` / `wizard-1-empty`).
 *
 * It deliberately pays **no bottom inset of its own**: whatever is bottom-most
 * on the hosting screen does — the wizard's pinned "Continue" footer, or
 * `CustomerSearchScreen`'s own `bottom` safe-area edge. Paying it here as well
 * left a gutter's worth of dead space under the list on the wizard's step 1.
 */
export function CustomerPickerList({ onPick, onCreateNew, header }: CustomerPickerListProps) {
  const [q, setQ] = useState('');

  const { data: customerTypes } = useCustomerTypes();
  const typeNameById = useMemo(
    () => Object.fromEntries((customerTypes ?? []).map((t) => [t.id, t.name])),
    [customerTypes],
  );

  const { items, isPending, isError, error, refetch, refresh, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage, dataUpdatedAt } =
    useCustomers({ q });

  return (
    <>
      {header}
      <SearchBar value={q} onChangeText={setQ} placeholder="Search customer name or phone" />
      <View style={styles.spacer} />
      <OfflineBanner dataUpdatedAt={dataUpdatedAt} />

      {isPending ? (
        <View style={styles.skeletons}>
          <Skeleton width="100%" height={ROW_HEIGHT} radius={radius.lg} />
          <Skeleton width="100%" height={ROW_HEIGHT} radius={radius.lg} />
          <Skeleton width="100%" height={ROW_HEIGHT} radius={radius.lg} />
        </View>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No customers match" hint="Try a different search, or create a new one." />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CustomerRow customer={item} typeName={typeNameById[item.customer_type_id]} onPress={() => onPick(item)} />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refresh()} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          ListFooterComponent={<ListFooter loading={isFetchingNextPage} />}
        />
      )}

      {/* Under the list, as the frame draws it: creating a customer is what you
          do when the register did *not* have them, so it reads after the
          answer rather than in front of it. */}
      <View style={styles.create}>
        <Button label="Create new customer" variant="outline" icon={Plus} fullWidth onPress={onCreateNew} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  spacer: { height: space[1] },
  list: { gap: gapList, paddingBottom: space[3] },
  skeletons: { gap: gapList, marginTop: space[2] },
  create: { paddingTop: space[3] },
});
