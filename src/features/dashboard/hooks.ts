import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { dashboardApi, RECENT_ORDERS_PARAMS } from './api';

export function useDashboard(salesUserId: string | null) {
  return useQuery({ queryKey: keys.dashboard(salesUserId), queryFn: () => dashboardApi.sales(salesUserId) });
}

export function useRecentOrders() {
  return useQuery({ queryKey: keys.orders(RECENT_ORDERS_PARAMS), queryFn: dashboardApi.recentOrders });
}
