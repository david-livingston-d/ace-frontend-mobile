import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, Card, ErrorState, Skeleton, EmptyState, useBottomClearance } from '@/ui';
import { Clock } from 'lucide-react-native';
import { gapList, space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { CONTROL } from '@/ui/tokens/layout';
import { getErrorMessage } from '@/lib/api/errors';
import { SALES_ERRORS } from '@/lib/sales/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useOrderTimeline } from '../hooks';
import { TimelineList } from '../components/TimelineList';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderTimeline'>;

export function TimelineScreen() {
  const navigation = useNavigation<Nav>();
  const clearance = useBottomClearance();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderTimeline'>>();
  const { id } = route.params;
  const { data, isPending, isError, error, refetch } = useOrderTimeline(id);

  return (
    <Screen title="Timeline" back={() => navigation.goBack()}>
      {isPending ? (
        <TimelineSkeleton />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error, SALES_ERRORS)} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Clock} title="No history yet" hint="Actions on this order will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: clearance }]}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <TimelineList items={data.items} />
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

/** Four haloed lines of history, in the card the real list sits in. */
function TimelineSkeleton() {
  return (
    <Card>
      <View style={styles.skeleton}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={CONTROL.timelineDisc} height={CONTROL.timelineDisc} radius={radius.pill} />
            <View style={styles.skeletonText}>
              <Skeleton width="70%" height={12} />
              <Skeleton width="45%" height={10} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: space[3] },
  skeleton: { gap: gapList + 4 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  skeletonText: { flex: 1, gap: space[2] },
});
