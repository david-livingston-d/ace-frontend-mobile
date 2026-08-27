import { useCallback } from 'react';
import { keepPreviousData, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export type ListEnvelope<T> = { items: T[]; total: number };

/** Pages any `{items, total}` register endpoint by `limit`/`offset`, flattening
 * every fetched page into one `items` array — the shape every M2 register list
 * (Orders now, Customers/Products later) is built on. */
export function useInfiniteList<T extends { id: string }>({
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
  const qc = useQueryClient();
  const queryKey = ['list', path, params, limit] as const;
  const q = useInfiniteQuery({
    queryKey,
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

  // Flattened across pages, then deduped by `id` keeping the *first*
  // occurrence: a register whose underlying rows can shift between page
  // fetches (a row's status changes between the first page loading and
  // "load more" firing, moving it across a sort/filter boundary) can
  // otherwise hand the same row back on two adjacent pages, which would
  // otherwise render it twice and give React two elements with the same key.
  const seen = new Set<string>();
  const items: T[] = [];
  for (const page of q.data?.pages ?? []) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  const total = q.data?.pages[0]?.total ?? 0;

  // Pull-to-refresh: re-fetches only the first page rather than every page
  // "load more" has fetched so far. TanStack Query v5 dropped v4's
  // `refetch({ refetchPage })` predicate, so this instead trims the cached
  // pages down to just the first *before* refetching — `getNextPageParam`
  // then naturally asks for `offset=0` again, and whatever "load more" had
  // paged in past that is discarded (re-fetching stale later pages against a
  // register whose first page just changed would ask for the wrong offsets
  // anyway).
  const refresh = useCallback(() => {
    qc.setQueryData<InfiniteData<ListEnvelope<T>, number>>(queryKey, (data) =>
      data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
    );
    return q.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, path, JSON.stringify(params), limit]);

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
    refresh,
    fetchNextPage: q.fetchNextPage,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    isRefetching: q.isRefetching,
    // `isPaused` is TanStack's "this query wanted to fetch but the device is
    // offline" flag, and `dataUpdatedAt` is when the rows on screen were last
    // true — together they are what `OfflineBanner` needs to say that a list is
    // showing saved data rather than live data.
    isPaused: q.isPaused,
    dataUpdatedAt: q.dataUpdatedAt,
  };
}
