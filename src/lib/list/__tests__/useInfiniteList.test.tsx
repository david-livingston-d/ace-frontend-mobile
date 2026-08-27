import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/client';
import { useInfiniteList } from '@/lib/list/useInfiniteList';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); queryClient.clear(); });
afterAll(() => server.close());

function Probe({ onState }: { onState: (s: ReturnType<typeof useInfiniteList<{ id: string }>>) => void }) {
  const state = useInfiniteList<{ id: string }>({ path: '/sales-orders', params: { open: true }, limit: 20 });
  onState(state);
  return <Text>{state.items.length}</Text>;
}

test('pages by limit/offset until total is reached', async () => {
  const seen: string[] = [];
  server.use(http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
    const u = new URL(request.url); seen.push(u.search);
    const offset = Number(u.searchParams.get('offset'));
    const items = Array.from({ length: Math.min(20, 45 - offset) }, (_, i) => ({ id: `o${offset + i}` }));
    return HttpResponse.json({ items, total: 45 });
  }));
  let last!: ReturnType<typeof useInfiniteList<{ id: string }>>;
  await render(<QueryClientProvider client={queryClient}><Probe onState={(s) => (last = s)} /></QueryClientProvider>);
  await waitFor(() => expect(last.items).toHaveLength(20));
  expect(last.hasNextPage).toBe(true);
  await last.fetchNextPage(); await waitFor(() => expect(last.items).toHaveLength(40));
  await last.fetchNextPage(); await waitFor(() => expect(last.items).toHaveLength(45));
  expect(last.hasNextPage).toBe(false);
  expect(seen[0]).toContain('open=true'); expect(seen[0]).toContain('limit=20'); expect(seen[0]).toContain('offset=0');
  expect(seen[2]).toContain('offset=40');
});

test('dedupes a row that appears on two pages, keeping the first occurrence', async () => {
  server.use(http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
    const offset = Number(new URL(request.url).searchParams.get('offset'));
    // The row `o2` (mid-sort) shifts back onto the second page too — e.g. its
    // status changed between the first page loading and "load more" firing.
    if (offset === 0) return HttpResponse.json({ items: [{ id: 'o1' }, { id: 'o2' }], total: 4 });
    return HttpResponse.json({ items: [{ id: 'o2' }, { id: 'o3' }], total: 4 });
  }));

  let last!: ReturnType<typeof useInfiniteList<{ id: string }>>;
  await render(<QueryClientProvider client={queryClient}><Probe onState={(s) => (last = s)} /></QueryClientProvider>);
  await waitFor(() => expect(last.items).toHaveLength(2));

  await last.fetchNextPage();
  await waitFor(() => expect(last.items.map((i) => i.id)).toEqual(['o1', 'o2', 'o3']));
});

test('refresh() discards pages fetched by "load more" and re-requests only offset=0', async () => {
  const seenOffsets: number[] = [];
  server.use(http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
    const offset = Number(new URL(request.url).searchParams.get('offset'));
    seenOffsets.push(offset);
    return HttpResponse.json({ items: [{ id: `o${offset}` }], total: 40 });
  }));

  function ProbeOne({ onState }: { onState: (s: ReturnType<typeof useInfiniteList<{ id: string }>>) => void }) {
    const state = useInfiniteList<{ id: string }>({ path: '/sales-orders', params: {}, limit: 1 });
    onState(state);
    return null;
  }

  let last!: ReturnType<typeof useInfiniteList<{ id: string }>>;
  await render(<QueryClientProvider client={queryClient}><ProbeOne onState={(s) => (last = s)} /></QueryClientProvider>);
  await waitFor(() => expect(last.items).toHaveLength(1));

  await last.fetchNextPage();
  await waitFor(() => expect(last.items).toHaveLength(2));
  expect(seenOffsets).toEqual([0, 1]);

  await last.refresh();
  await waitFor(() => expect(last.items).toHaveLength(1));
  expect(seenOffsets[seenOffsets.length - 1]).toBe(0);
  // Only the first page survived the refresh — "load more" has to be pressed
  // again rather than the discarded second page silently reappearing.
  expect(last.hasNextPage).toBe(true);
});
