import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
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
    // Typing in a register's search box changes `params`, and so the query key.
    // Without a placeholder that is a brand-new query on every keystroke: the
    // list unmounts to a skeleton and flashes back, which reads as the screen
    // breaking rather than filtering. Keeping the previous page(s) on screen
    // (greyed only by `isFetching`, if a caller wants that) is the register
    // behaviour the web app already has.
    placeholderData: keepPreviousData,
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
    // Only "pending" when there is genuinely nothing to render: with
    // `keepPreviousData` the previous search's rows stand in while the new one
    // loads, and a skeleton over the top of them would defeat the point.
    isPending: q.isPending && !q.data,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
    fetchNextPage: q.fetchNextPage,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    isRefetching: q.isRefetching,
  };
}
