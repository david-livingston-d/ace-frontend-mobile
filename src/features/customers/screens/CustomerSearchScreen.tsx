import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Users } from 'lucide-react-native';
import { Screen, SearchBar, Text, EmptyState, ErrorState, Skeleton, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useCustomers } from '../hooks';
import { useCustomerTypes } from '@/features/masters/hooks';
import { CustomerRow } from '../components/CustomerRow';
import type { CustomerOut } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerSearch'>;

export function CustomerSearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerSearch'>>();
  const onPick = route.params?.onPick;
  const [q, setQ] = useState('');

  const { data: customerTypes } = useCustomerTypes();
  const typeNameById = useMemo(
    () => Object.fromEntries((customerTypes ?? []).map((t) => [t.id, t.name])),
    [customerTypes],
  );

  const { items, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCustomers({ q });

  function openCustomer(customer: CustomerOut) {
    if (onPick === 'order') {
      navigation.navigate('NewOrder', { pickedCustomerId: customer.id });
    } else {
      navigation.navigate('CustomerDetail', { id: customer.id });
    }
  }

  function createNew() {
    navigation.navigate('CustomerCreate', { returnTo: onPick === 'order' ? 'order' : 'detail' });
  }

  return (
    <Screen title="Customers" back={() => navigation.goBack()}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search customer name or phone" />
      <CreateNewRow onPress={createNew} />

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
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CustomerRow customer={item} typeName={typeNameById[item.customer_type_id]} onPress={() => openCustomer(item)} />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} /> : null}
        />
      )}
    </Screen>
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
  footerSpinner: { paddingVertical: space[4] },
});
