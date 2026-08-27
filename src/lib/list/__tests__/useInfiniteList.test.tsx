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
