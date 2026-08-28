import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, StyleSheet } from 'react-native';
import { Plus, Users } from 'lucide-react-native';
import { EmptyState, ErrorState, ListFooter, OfflineBanner, SearchBar, Skeleton, Text, useBottomClearance, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
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

/**
 * The searchable customer register, shared by the standalone `CustomerSearch`
 * route and by the order wizard's customer step — one list, one debounce, one
 * empty state, so "pick a customer" reads identically wherever it happens.
 */
export function CustomerPickerList({ onPick, onCreateNew, header }: CustomerPickerListProps) {
  const [q, setQ] = useState('');
  const clearance = useBottomClearance();

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
      <CreateNewRow onPress={onCreateNew} />
      <OfflineBanner dataUpdatedAt={dataUpdatedAt} />

      {isPending ? (
        <View style={styles.skeletons}>
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
        </View>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No customers match" hint="Try a different search, or create a new one." />
      ) : (
        <FlatList
          contentContainerStyle={{ paddingBottom: clearance }}
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
    </>
  );
}

function CreateNewRow({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.createRow}>
      <Plus size={18} color={theme.colors.text} />
      <Text variant="body">Create new customer</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  createRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3] },
  skeletons: { gap: space[2], marginTop: space[2] },
});
