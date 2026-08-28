import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Skeleton } from '@/ui';
import { radius } from '@/ui/tokens/radius';
import { gapList, space } from '@/ui/tokens/spacing';

/** Fix round 1 (finding 3): mirrors a real `DeliverableLine`'s shape — title
 * + caption on the left, a stepper-sized box on the right, a caption footer
 * underneath — inside the same lifted `Card`, so nothing shifts once the
 * deliverable lines arrive. Replaces the two 110px blocks left over from an
 * earlier, taller line card design. */
function SkeletonRow() {
  return (
    <Card padding="row" style={styles.card} testID="deliverable-skeleton-row">
      <View style={styles.row}>
        <View style={styles.body}>
          <Skeleton width={150} height={13} />
          <Skeleton width={90} height={11} />
        </View>
        <Skeleton width={104} height={36} radius={radius.md} />
      </View>
      <Skeleton width={130} height={11} />
    </Card>
  );
}

export type DeliverableLineSkeletonProps = {
  /** A verified order typically carries two or three lines on device. */
  count?: number;
};

export function DeliverableLineSkeleton({ count = 3 }: DeliverableLineSkeletonProps) {
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
  card: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  body: { flex: 1, gap: space[1] },
});
