import { api } from '@/lib/api/client';
import type { DashboardSalesOut, SalesOrderListItem } from './types';

// Shared by the request and by `keys.orders(...)` in hooks.ts — kept as a
// single constant so the query key can never drift from the params it's
// actually caching the response for.
export const RECENT_ORDERS_PARAMS = { limit: 5, open: true } as const;

export const dashboardApi = {
  sales: (salesUserId: string | null) =>
    api.get<DashboardSalesOut>('/dashboard/sales', { params: salesUserId ? { sales_user_id: salesUserId } : {} }).then((r) => r.data),
  recentOrders: () =>
    api.get<{ items: SalesOrderListItem[]; total: number }>('/sales-orders', { params: RECENT_ORDERS_PARAMS }).then((r) => r.data.items),
};
