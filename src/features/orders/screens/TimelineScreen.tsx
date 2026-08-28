import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, Card, ErrorState, HeaderRow, Skeleton, StatusChip, Text, EmptyState, useBottomClearance } from '@/ui';
import { Clock } from 'lucide-react-native';
import { gapList, space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { CONTROL } from '@/ui/tokens/layout';
import { getErrorMessage } from '@/lib/api/errors';
import { SALES_ERRORS } from '@/lib/sales/errors';
import { phaseLabel, phaseTone } from '@/lib/sales/status';
import type { RootStackParamList } from '@/navigation/types';
import { useOrder, useOrderTimeline } from '../hooks';
import { TimelineList, futureNodes } from '../components/TimelineList';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderTimeline'>;

export function TimelineScreen() {
  const navigation = useNavigation<Nav>();
  const clearance = useBottomClearance();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderTimeline'>>();
  const { id } = route.params;
  const { data, isPending, isError, error, refetch } = useOrderTimeline(id);
  // The `timeline` frame's header card, and the phase the future nodes are
  // derived from. Reached from the order screen this is a *cache read*, not a
  // second request: `useOrder` is keyed `['order', id]`, which `OrderDetail`
  // has already filled. Only a cold deep link actually fetches — hence
  // `order.isPending` in the loading branch below.
  const order = useOrder(id);

  return (
    <Screen title="Timeline" back={() => navigation.goBack()}>
      {isPending || order.isPending ? (
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
          {/* The order itself may still fail (or be forbidden) while its
              history loads fine — the rail is the screen, the header only its
              caption, so it is simply left out rather than failing the page. */}
          {order.data ? (
            <Card padding="row">
              <HeaderRow>
                <View style={styles.identity}>
                  <Text variant="caption" color="muted" numberOfLines={1}>{order.data.customer_name}</Text>
                  <Text variant="cardTitle" numberOfLines={1}>{order.data.number}</Text>
                </View>
                <StatusChip tone={phaseTone(order.data.phase)} label={phaseLabel(order.data.phase)} />
              </HeaderRow>
            </Card>
          ) : null}
          <Card>
            <TimelineList
              items={data.items}
              future={order.data ? futureNodes(order.data.phase, order.data.summary.receivable) : []}
            />
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

/** The header card and four haloed lines of history, at the sizes the real
 * ones land at, so nothing jumps when the order arrives. */
function TimelineSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <Card padding="row">
        <HeaderRow>
          <Skeleton width="45%" height={16} />
          <Skeleton width="25%" height={12} radius={radius.pill} />
        </HeaderRow>
      </Card>
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
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: space[3], gap: gapList },
  identity: { flex: 1 },
  skeletonPage: { paddingTop: space[3], gap: gapList },
  skeleton: { gap: gapList + 4 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  skeletonText: { flex: 1, gap: space[2] },
});
