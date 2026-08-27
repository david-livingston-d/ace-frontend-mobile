import React, { useState } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { OrdersListScreen } from '@/features/orders/screens/OrdersListScreen';
import { Providers } from '@/providers';
import { useOrderFilters } from '@/store/filters';
import { queryClient } from '@/lib/query/client';
import { onlineManager } from '@tanstack/react-query';

const mockNavigate = jest.fn();
// Mutable, test-controlled route params + a real `setParams` that merges into
// them and produces a brand-new object each time — exactly what
// `@react-navigation/routers`' `BaseRouter` does for `SET_PARAMS` in
// production. Only the C1 regression test below sets `mockRouteParams`; every
// other test leaves it `undefined`, matching this file's previous fixed mock.
let mockRouteParams: { preset?: string; dateFrom?: string; dateTo?: string } | undefined;
let mockForceRerender: (() => void) | undefined;
const mockSetParams = jest.fn((patch: Record<string, unknown>) => {
  mockRouteParams = { ...(mockRouteParams ?? {}), ...patch };
  // Deferred to a microtask rather than called synchronously: a real
  // navigator's params update doesn't re-render the screen from inside the
  // screen's own render pass either — this avoids a synchronous
  // "update a component while rendering a different component" call while
  // still exercising the real re-render-with-new-params-object path.
  Promise.resolve().then(() => mockForceRerender?.());
});
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }), useRoute: () => ({ params: mockRouteParams }), useFocusEffect: (cb: () => void) => cb() }));
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  useOrderFilters.getState().reset();
  mockNavigate.mockClear();
  mockSetParams.mockClear();
  mockRouteParams = undefined;
  mockForceRerender = undefined;
  // Restored outside `act`: RTL's cleanup has already unmounted everything, and
  // an un-awaited `act(...)` here would leave React's act scope open and break
  // the next test's updates.
  onlineManager.setOnline(true);
});
afterAll(() => server.close());

// A small wrapper that holds a render-forcing counter, standing in for
// react-navigation's own internal re-render-on-params-change — lets
// `mockSetParams` trigger a real second render of `OrdersListScreen` with a
// new (but still-mutated-in-place) `mockRouteParams` object, the same way a
// real focused screen would see its route params change after `setParams`.
function RouteParamsHarness() {
  const [, bump] = useState(0);
  mockForceRerender = () => bump((n) => n + 1);
  return <OrdersListScreen />;
}

const me = (permissions: Record<string, string>) => http.get('http://localhost:8000/api/v1/auth/me', () =>
  HttpResponse.json({ id: 'u1', email: 'k@ace.in', name: 'Karthik S', is_superadmin: false, permissions, department_id: null, team_id: null, roles: [] }));
const order = (id: string, number: string, customer: string) => ({ id, number, customer_id: 'c1', customer_name: customer, sales_user_id: 'u1', sales_user_name: 'Karthik S', order_date: '2026-08-12', expected_delivery_date: '2026-08-18', net: '2495.00', ordered_qty: '5', reserved_qty: '0', delivered_qty: '0', invoiced_qty: '0', paid_amount: '0.00', outstanding: '2495.00', phase: 'draft', reservation_status: 'not_reserved', delivery_status: 'not_delivered', invoice_status: 'not_invoiced', payment_status: 'unpaid', has_open_shortage: false });

test('lists open orders by default, searches with q, and opens a detail', async () => {
  const queries: string[] = [];
  server.use(me({ 'sales_order.read': 'own' }), http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
    queries.push(new URL(request.url).search);
    return HttpResponse.json({ items: [order('o1', 'POS-26-27-000041', 'Arjun Mehta')], total: 1 });
  }));
  const { findByText, getByPlaceholderText } = await render(<Providers><OrdersListScreen /></Providers>);
  expect(await findByText('POS-26-27-000041')).toBeTruthy();
  expect(queries[0]).toContain('open=true');
  await fireEvent.changeText(getByPlaceholderText('Search client or order #'), 'arjun');
  await waitFor(() => expect(queries.some((q) => q.includes('q=arjun'))).toBe(true));
  await fireEvent.press(await findByText('POS-26-27-000041'));
  expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { id: 'o1' });
});

test('filter sheet applies a status chip and shows it as an active chip; sales-user filter only above own scope', async () => {
  server.use(me({ 'sales_order.read': 'all' }), http.get('http://localhost:8000/api/v1/sales-orders', () => HttpResponse.json({ items: [], total: 0 })),
    http.get('http://localhost:8000/api/v1/dashboard/sales', () => HttpResponse.json({ as_of: '2026-08-12', scope: 'all', tiles: { today_orders: 0, open_orders: 0, pending_deliveries: 0, payment_pending_count: 0, payment_pending_amount: '0' }, due: { overdue: 0, due_today: 0, due_this_week: 0 }, collected_this_month: null, outstanding: null, last_7_days: [], sales_users: [{ id: 'u1', name: 'Karthik' }, { id: 'u2', name: 'Divya' }] })));
  const { findByText, findByLabelText } = await render(<Providers><OrdersListScreen /></Providers>);
  await fireEvent.press(await findByLabelText('Filters'));
  expect(await findByText('SALES USER')).toBeTruthy();
  await fireEvent.press(await findByText('Pending delivery'));
  await fireEvent.press(await findByText('APPLY FILTERS'));
  expect(useOrderFilters.getState().filters.preset).toBe('pendingDelivery');
  expect(await findByText('Pending delivery')).toBeTruthy();        // active chip
  // `findByText`, not the brief's `queryByText`: applying the preset changes
  // the query key, so the register's `/sales-orders` re-fetch for the new
  // params is still in flight (msw's mock response is a real, if fast, async
  // round trip) at the instant the chip's own synchronous store update makes
  // `findByText` above resolve — a bare synchronous `queryByText` right after
  // races that fetch and reliably finds the still-loading skeleton instead.
  expect(await findByText('No orders match')).toBeTruthy();
});

// C1 regression: `navigation.setParams(...)` always hands back a brand-new
// params object (verified in `@react-navigation/routers`' `BaseRouter`), and a
// real `useFocusEffect` re-runs whenever its callback identity changes while
// focused. The old code keyed its `useCallback` on `route.params` itself, so
// consuming `{ preset: 'pendingDelivery' }` cleared it to a *new*, still-truthy
// `{ preset: undefined, ... }` object — which the old `if (route.params)`
// guard treated as "there's a preset to apply", wiping the just-applied preset
// and calling `setParams` again, forever. `RouteParamsHarness` (above) drives
// `mockRouteParams`/`mockSetParams` the same way a real focused screen would:
// `setParams` merges into a fresh object and forces a real second render.
test('consumes a route preset once and does not loop (C1 regression)', async () => {
  mockRouteParams = { preset: 'pendingDelivery' };
  const queries: string[] = [];
  server.use(
    me({ 'sales_order.read': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
      queries.push(new URL(request.url).search);
      return HttpResponse.json({ items: [], total: 0 });
    }),
  );

  await render(<Providers><RouteParamsHarness /></Providers>);

  await waitFor(() => expect(useOrderFilters.getState().filters.preset).toBe('pendingDelivery'));
  await waitFor(() => expect(queries.some((q) => q.includes('pending=true'))).toBe(true));
  // Give the (buggy, pre-fix) infinite loop a real chance to run before
  // asserting convergence — several microtask/render ticks, not just one.
  await new Promise((resolve) => setTimeout(() => resolve(undefined), 50));

  expect(mockSetParams).toHaveBeenCalledTimes(1);
  expect(useOrderFilters.getState().filters.preset).toBe('pendingDelivery');
});

// I1 fix: pull-to-refresh was wired to `refresh()` (which trims cached pages
// back to just the first before refetching), not the plain `refetch()` that
// re-requests every page "load more" has fetched so far — see
// `useInfiniteList`'s own `refresh` comment. This drives the screen through a
// real "load more" first (so there is a discarded second page to prove is
// gone), then triggers the `FlatList`'s `RefreshControl` directly.
test('pull-to-refresh re-requests only offset=0, not the page "load more" already fetched', async () => {
  const offsets: number[] = [];
  server.use(
    me({ 'sales_order.read': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
      const offset = Number(new URL(request.url).searchParams.get('offset'));
      offsets.push(offset);
      const items = Array.from({ length: 20 }, (_, i) => order(`o${offset + i}`, `POS-${offset + i}`, 'Arjun Mehta'));
      return HttpResponse.json({ items, total: 45 });
    }),
  );

  const utils = await render(<Providers><OrdersListScreen /></Providers>);
  expect(await utils.findByText('POS-0')).toBeTruthy();
  expect(offsets).toEqual([0]);

  // `FlatList`'s windowing (`initialNumToRender`) only mounts the first ~10
  // rows regardless of how many pages are loaded, so the proof that the
  // second page was actually fetched (and is there to be discarded) is the
  // request itself, not a row from it appearing on screen.
  await act(async () => utils.getByTestId('orders-list').props.onEndReached());
  await waitFor(() => expect(offsets).toEqual([0, 20]));

  offsets.length = 0;
  await act(async () => utils.getByTestId('orders-list').props.refreshControl.props.onRefresh());

  await waitFor(() => expect(offsets).toEqual([0]));
  expect(offsets).not.toContain(20);
});

test('going offline says so above the rows it is still showing', async () => {
  // Reads keep `networkMode: 'online'`, so what stays on screen is the last
  // fetched page — correct, but only if the screen admits it is saved data
  // rather than passing it off as live.
  server.use(
    me({ 'sales_order.read': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders', () =>
      HttpResponse.json({ items: [order('o1', 'POS-26-27-000041', 'Arjun Mehta')], total: 1 })),
  );

  const utils = await render(<Providers><OrdersListScreen /></Providers>);
  expect(await utils.findByText('POS-26-27-000041')).toBeTruthy();
  expect(utils.queryByTestId('offline-banner')).toBeNull();

  await act(async () => { onlineManager.setOnline(false); });

  expect(utils.getByTestId('offline-banner')).toBeTruthy();
  // The saved rows are still there — the banner is an affordance, not a wipe.
  expect(utils.getByText('POS-26-27-000041')).toBeTruthy();

  await act(async () => { onlineManager.setOnline(true); });
  await waitFor(() => expect(utils.queryByTestId('offline-banner')).toBeNull());
});
