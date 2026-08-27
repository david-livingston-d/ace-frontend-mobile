import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/ui';
import { space } from '@/ui/tokens/spacing';

/** Mirrors `OrderRow`'s shape (number + status chip, customer/amount line,
 * two status chips, committed-date line) so the loading state doesn't jump
 * once real rows replace it. */
function SkeletonRow() {
  return (
    <View style={styles.row}>
      <View style={styles.headerLine}>
        <Skeleton width="55%" height={16} />
        <Skeleton width={64} height={18} radius={999} />
      </View>
      <Skeleton width="70%" height={14} />
      <View style={styles.chipsRow}>
        <Skeleton width={90} height={18} radius={999} />
        <Skeleton width={90} height={18} radius={999} />
      </View>
      <Skeleton width="40%" height={12} />
    </View>
  );
}

export function OrdersSkeleton() {
  return (
    <View>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[2], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  headerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRow: { flexDirection: 'row', gap: space[2] },
});
