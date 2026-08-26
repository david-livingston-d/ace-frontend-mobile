import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, Button, Skeleton } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { OrderRow } from '@/features/orders/components/OrderRow';
import type { TabParamList } from '@/navigation/types';
import type { SalesOrderListItem } from '../types';

export type RecentOrdersProps = {
  orders: SalesOrderListItem[];
  isLoading: boolean;
  showSalesUser?: boolean;
};

export function RecentOrders({ orders, isLoading, showSalesUser }: RecentOrdersProps) {
  const navigation = useNavigation<NavigationProp<TabParamList>>();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="label" color="textMuted">RECENT ORDERS</Text>
        <Button label="View all" variant="ghost" onPress={() => navigation.navigate('Orders')} />
      </View>
      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={72} />
          ))}
        </View>
      ) : (
        // Row tap-through lands with M2's order detail screen — not wired here since
        // that screen doesn't exist yet in M1.
        orders.map((order) => <OrderRow key={order.id} order={order} showSalesUser={showSalesUser} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space[4] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skeletons: { gap: space[2] },
});
