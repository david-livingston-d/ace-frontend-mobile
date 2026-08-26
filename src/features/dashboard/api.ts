import { api } from '@/lib/api/client';
import type { DashboardSalesOut, SalesOrderListItem } from './types';

export const dashboardApi = {
  sales: (salesUserId: string | null) =>
    api.get<DashboardSalesOut>('/dashboard/sales', { params: salesUserId ? { sales_user_id: salesUserId } : {} }).then((r) => r.data),
  recentOrders: () =>
    api.get<{ items: SalesOrderListItem[]; total: number }>('/sales-orders', { params: { limit: 5, open: true } }).then((r) => r.data.items),
};
