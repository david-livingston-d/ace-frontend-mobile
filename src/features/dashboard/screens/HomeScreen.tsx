import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Screen, Skeleton, ErrorState, OfflineBanner, useBottomClearance } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { useMe } from '@/features/auth/hooks';
import { useScope } from '@/lib/permissions';
import { UpdateBanner } from '@/features/profile/components/UpdateBanner';
import type { OrderPreset } from '@/features/orders/filters';
import type { TabParamList } from '@/navigation/types';
import { useDashboard, useRecentOrders } from '../hooks';
import type { DashboardSalesOut } from '../types';
import { Greeting } from '../components/Greeting';
import { TeamChips } from '../components/TeamChips';
import { KpiGrid } from '../components/KpiGrid';
import { DueStrip } from '../components/DueStrip';
import { MoneyCards } from '../components/MoneyCards';
import { Last7DaysChart } from '../components/Last7DaysChart';
import { RecentOrders } from '../components/RecentOrders';

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const { data: me, refetch: refetchMe } = useMe();
  const scope = useScope('sales_order.read');
  const [selectedSalesUserId, setSelectedSalesUserId] = useState<string | null>(null);
  const clearance = useBottomClearance();
  const dashboard = useDashboard(selectedSalesUserId);
  const recentOrders = useRecentOrders();

  function navigateToOrders(preset: OrderPreset) {
    navigation.navigate('Orders', { preset });
  }

  function navigateToPaymentsByCustomer() {
    navigation.navigate('Payments', { view: 'customers' });
  }

  async function handleRefresh() {
    await Promise.all([dashboard.refetch(), recentOrders.refetch(), refetchMe()]);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: clearance }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={dashboard.isRefetching || recentOrders.isRefetching} onRefresh={handleRefresh} />
        }
      >
        <UpdateBanner />
        <OfflineBanner dataUpdatedAt={dashboard.dataUpdatedAt} />
        <Greeting name={me?.name} />

        {dashboard.isPending ? (
          <DashboardSkeleton />
        ) : dashboard.isError ? (
          <ErrorState message={getErrorMessage(dashboard.error)} onRetry={() => dashboard.refetch()} />
        ) : dashboard.data ? (
          <DashboardBody
            data={dashboard.data}
            selectedSalesUserId={selectedSalesUserId}
            onSelectSalesUser={setSelectedSalesUserId}
            onNavigate={navigateToOrders}
            onNavigateOutstanding={navigateToPaymentsByCustomer}
          />
        ) : null}

        <RecentOrders
          orders={recentOrders.data ?? []}
          isLoading={recentOrders.isPending}
          showSalesUser={scope !== 'own'}
        />
      </ScrollView>
    </Screen>
  );
}

function DashboardBody({
  data,
  selectedSalesUserId,
  onSelectSalesUser,
  onNavigate,
  onNavigateOutstanding,
}: {
  data: DashboardSalesOut;
  selectedSalesUserId: string | null;
  onSelectSalesUser: (id: string | null) => void;
  onNavigate: (preset: OrderPreset) => void;
  onNavigateOutstanding: () => void;
}) {
  return (
    <>
      {data.sales_users.length > 0 ? (
        <TeamChips users={data.sales_users} selectedId={selectedSalesUserId} onSelect={onSelectSalesUser} />
      ) : null}
      <KpiGrid tiles={data.tiles} onNavigate={onNavigate} />
      <DueStrip due={data.due} onNavigate={onNavigate} />
      {data.collected_this_month !== null ? (
        <MoneyCards
          collectedThisMonth={data.collected_this_month}
          outstanding={data.outstanding}
          onPressOutstanding={onNavigateOutstanding}
        />
      ) : null}
      <Last7DaysChart days={data.last_7_days} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.skeletonGrid}>
      <View style={styles.skeletonRow}>
        <Skeleton width="47%" height={88} />
        <Skeleton width="47%" height={88} />
      </View>
      <View style={styles.skeletonRow}>
        <Skeleton width="47%" height={88} />
        <Skeleton width="47%" height={88} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonGrid: { gap: space[3], marginTop: space[2] },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
