import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider, Skeleton } from '@/ui';
import { controlRadius } from '@/ui/tokens/radius';
import { gapList, space } from '@/ui/tokens/spacing';

/** Mirrors a real `PaymentRow`/`ReceivableRow` — title, meta line and the
 * trailing amount + badge column — inside the same lifted card, so nothing
 * shifts when the rows arrive. */
function SkeletonRow({ metrics }: { metrics: boolean }) {
  return (
    <Card padding="row" testID="payments-skeleton-row">
      <View style={styles.row}>
        <View style={styles.body}>
          <Skeleton width={140} height={13} />
          <Skeleton width={180} height={11} />
        </View>
        <View style={styles.trailing}>
          <Skeleton width={76} height={13} />
          <Skeleton width={64} height={18} radius={controlRadius.badge} />
        </View>
      </View>
      {metrics ? (
        <>
          <Divider style={styles.rule} />
          <View style={styles.metrics}>
            <Skeleton width={58} height={10} />
            <Skeleton width={46} height={10} />
            <Skeleton width={72} height={10} />
          </View>
        </>
      ) : null}
    </Card>
  );
}

export type PaymentsSkeletonProps = {
  /** Four card rows fill a phone screen. */
  count?: number;
  /** Adds the Billed / Paid / Outstanding strip — the "By customer" view's
   * rows carry one, the History register's do not. */
  metrics?: boolean;
};

export function PaymentsSkeleton({ count = 4, metrics = false }: PaymentsSkeletonProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} metrics={metrics} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: gapList },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  body: { flex: 1, gap: space[2] },
  trailing: { alignItems: 'flex-end', gap: space[2] },
  rule: { marginVertical: space[2] },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
});
