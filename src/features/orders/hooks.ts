import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { keys } from '@/lib/query/keys';
import { ordersApi } from './api';
import { filtersToParams, type OrderFilters } from './filters';
import type { SalesOrderListItem, SalesOrderDetail } from './types';

/** The register's search box debounces before it becomes a request — every
 * keystroke would otherwise fire its own `/sales-orders?q=...` call. */
export function useOrders(filters: OrderFilters) {
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const params = useMemo(
    () => filtersToParams({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );
  return useInfiniteList<SalesOrderListItem>({ path: '/sales-orders', params });
}

export function useOrder(id: string) {
  return useQuery({ queryKey: keys.order(id), queryFn: () => ordersApi.get(id) });
}

export function useOrderTimeline(id: string) {
  return useQuery({ queryKey: keys.orderTimeline(id), queryFn: () => ordersApi.timeline(id) });
}

/** Every order-detail mutation (verify, cancel, and M3/M5's onward) reshapes
 * the same three *other* places: the register list the order appears in,
 * Home's dashboard tiles, and its own timeline. Keyed as prefixes so
 * `invalidateQueries`' default partial match catches every params/limit
 * variant already cached for each.
 *
 * Deliberately does NOT invalidate `keys.order(id)` — only the verify/cancel
 * response itself carries `warnings` (e.g. `credit_limit_exceeded`); a plain
 * `GET /sales-orders/{id}` does not echo them back. Invalidating here would
 * trigger a refetch that silently drops the warning the mutation just
 * returned. The caller instead seeds the cache directly with the full
 * detail the mutation already got back (see `useVerifyOrder`/`useCancelOrder`). */
function invalidateOrderSideEffects(qc: QueryClient, id: string) {
  qc.invalidateQueries({ queryKey: ['list', '/sales-orders'] });
  // Not `keys.dashboard()` — that appends a concrete `salesUserId` (or `null`)
  // as this order's own viewer may not be the dashboard's, so a literal
  // `['dashboard']` prefix is the only way to catch every cached scope.
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: keys.orderTimeline(id) });
}

export function useVerifyOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.verify(id),
    onSuccess: (data, id) => {
      qc.setQueryData<SalesOrderDetail>(keys.order(id), data);
      invalidateOrderSideEffects(qc, id);
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.cancel(id, { reason }),
    onSuccess: (data, vars) => {
      qc.setQueryData<SalesOrderDetail>(keys.order(vars.id), data);
      invalidateOrderSideEffects(qc, vars.id);
    },
  });
}
