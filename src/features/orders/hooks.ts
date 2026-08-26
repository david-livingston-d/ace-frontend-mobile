import { useMemo } from 'react';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { filtersToParams, type OrderFilters } from './filters';
import type { SalesOrderListItem } from './types';

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
