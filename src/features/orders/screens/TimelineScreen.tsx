import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, ErrorState, Skeleton, EmptyState } from '@/ui';
import { Clock } from 'lucide-react-native';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { SALES_ERRORS } from '@/lib/sales/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useOrderTimeline } from '../hooks';
import { TimelineList } from '../components/TimelineList';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderTimeline'>;

export function TimelineScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderTimeline'>>();
  const { id } = route.params;
  const { data, isPending, isError, error, refetch } = useOrderTimeline(id);

  return (
    <Screen title="Timeline" back={() => navigation.goBack()}>
      {isPending ? (
        <Skeleton width="100%" height={200} />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error, SALES_ERRORS)} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Clock} title="No history yet" hint="Actions on this order will show up here." />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <TimelineList items={data.items} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ scroll: { paddingVertical: space[3], paddingBottom: space[6] } });
