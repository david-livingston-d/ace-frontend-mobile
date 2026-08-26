import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export type ListEnvelope<T> = { items: T[]; total: number };

/** Pages any `{items, total}` register endpoint by `limit`/`offset`, flattening
 * every fetched page into one `items` array — the shape every M2 register list
 * (Orders now, Customers/Products later) is built on. */
export function useInfiniteList<T>({
  path,
  params,
  limit = 20,
  enabled = true,
}: {
  path: string;
  params: Record<string, unknown>;
  limit?: number;
  enabled?: boolean;
}) {
  const q = useInfiniteQuery({
    queryKey: ['list', path, params, limit] as const,
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.get<ListEnvelope<T>>(path, { params: { ...params, limit, offset: pageParam } }).then((r) => r.data),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;
  return {
    items,
    total,
    isPending: q.isPending,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
    fetchNextPage: q.fetchNextPage,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    isRefetching: q.isRefetching,
  };
}
