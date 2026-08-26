import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { dashboardApi } from './api';

export function useDashboard(salesUserId: string | null) {
  return useQuery({ queryKey: keys.dashboard(salesUserId), queryFn: () => dashboardApi.sales(salesUserId) });
}

export function useRecentOrders() {
  return useQuery({ queryKey: keys.orders({ limit: 5, open: true }), queryFn: dashboardApi.recentOrders });
}
