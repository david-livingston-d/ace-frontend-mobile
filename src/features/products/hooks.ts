import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { keys } from '@/lib/query/keys';
import { productsApi } from './api';
import type { ProductListItem } from './types';

// Re-exported rather than re-implemented: the products browse screen needs the
// same category lookup list Task 3's masters already fetch (10-minute
// `staleTime`, shared cache key) — a second copy here would just double the request.
export { useCategories } from '@/features/masters/hooks';

/** The browse grid's search box debounces before it becomes a request — same
 * reasoning as `useOrders`/`useCustomers` (see their own comments). */
export function useProducts({ q, categoryId }: { q: string; categoryId: string | null }) {
  const debouncedQ = useDebouncedValue(q, 300);
  const params = useMemo(() => {
    const p: Record<string, unknown> = { is_active: true };
    if (debouncedQ.trim()) p.q = debouncedQ.trim();
    if (categoryId) p.category_id = categoryId;
    return p;
  }, [debouncedQ, categoryId]);
  return useInfiniteList<ProductListItem>({ path: '/products', params });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: keys.product(id), queryFn: () => productsApi.get(id), enabled: !!id });
}

/** Typeahead for the browse screen's "SKU matches" section. The caller (not
 * this hook) decides whether `q` looks like a SKU worth searching for — pass
 * `''` when it doesn't, which the `enabled` guard below turns into "don't fetch". */
export function useVariantSearch(q: string) {
  return useQuery({
    queryKey: keys.variants(q),
    queryFn: () => productsApi.searchVariants(q).then((r) => r.items),
    enabled: q.length >= 1,
  });
}
