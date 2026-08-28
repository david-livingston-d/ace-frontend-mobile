import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Button, HeaderRow, Text } from '@/ui';
import { gapList, space } from '@/ui/tokens/spacing';
import { OrderRow } from '@/features/orders/components/OrderRow';
import { OrdersSkeleton } from '@/features/orders/components/OrdersSkeleton';
import type { TabParamList } from '@/navigation/types';
import type { SalesOrderListItem } from '../types';

export type RecentOrdersProps = {
  orders: SalesOrderListItem[];
  isLoading: boolean;
  showSalesUser?: boolean;
};

/** Home's tail (`home-exec` frame): a section label, one way out ("View all"
 * as an outline pill, not a ghost link), and the same `RowCard`s the Orders
 * register is built from — one row design, two screens. */
export function RecentOrders({ orders, isLoading, showSalesUser }: RecentOrdersProps) {
  const navigation = useNavigation<NavigationProp<TabParamList>>();

  return (
    <View style={styles.wrap}>
      <HeaderRow>
        <Text variant="label" color="muted">Recent orders</Text>
        <Button
          label="View all"
          variant="outline"
          size="sm"
          onPress={() => navigation.navigate('Orders', { preset: undefined })}
        />
      </HeaderRow>
      {isLoading ? (
        <OrdersSkeleton count={3} />
      ) : (
        <View style={styles.rows}>
          {/* Row tap-through lands with M2's order detail screen — not wired here since
              that screen doesn't exist yet in M1. */}
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} showSalesUser={showSalesUser} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space[4], gap: space[3] },
  rows: { gap: gapList },
});
