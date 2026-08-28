import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider, Skeleton } from '@/ui';
import { controlRadius } from '@/ui/tokens/radius';
import { gapChips, gapList, space } from '@/ui/tokens/spacing';

/** Mirrors a real `OrderRow`'s shape — title + phase badge, meta line, two
 * status badges, the metrics strip — inside the same lifted card, so nothing
 * shifts when the rows arrive (`orders-skeleton` frame). */
function SkeletonRow() {
  return (
    <Card padding="row">
      <View style={styles.body}>
        <View style={styles.headerLine}>
          <Skeleton width={130} height={13} />
          <Skeleton width={64} height={18} radius={controlRadius.badge} />
        </View>
        <Skeleton width={170} height={11} />
        <View style={styles.chipsRow}>
          <Skeleton width={90} height={18} radius={controlRadius.badge} />
          <Skeleton width={90} height={18} radius={controlRadius.badge} />
        </View>
        <Divider />
        <View style={styles.headerLine}>
          <Skeleton width={52} height={10} />
          <Skeleton width={62} height={10} />
          <Skeleton width={66} height={10} />
          <Skeleton width={74} height={10} />
        </View>
      </View>
    </Card>
  );
}

export type OrdersSkeletonProps = {
  /** Four card rows fill a phone screen; Home's "recent orders" shows three. */
  count?: number;
};

export function OrdersSkeleton({ count = 4 }: OrdersSkeletonProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: gapList },
  body: { gap: space[2] },
  headerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRow: { flexDirection: 'row', gap: gapChips },
});
