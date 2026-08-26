import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
// msw/node, not msw/native — see src/lib/api/__tests__/tokens.test.ts: under Jest's
// `testEnvironment: 'node'`, axios uses its Node http adapter, which only msw/node sees.
import { setupServer } from 'msw/node';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';

// Named `mockNavigate` (not `navigate`) so babel-plugin-jest-hoist's out-of-scope-variable
// check for jest.mock() factories allows it — it exempts only `mock`-prefixed names.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: mockNavigate }) }));
// `/app/version` is hit by `UpdateBanner` on every render — give it a default
// "everything's current" response so it never falls into `onUnhandledRequest:
// 'error'` (same pattern as src/navigation/__tests__/RootNavigator.test.tsx).
const version = http.get('http://localhost:8000/api/v1/app/version', () =>
  HttpResponse.json({ android: { latest_version: '0.1.0', min_supported_version: '0.1.0', download_url: 'https://example.test/app.apk' } }));
const server = setupServer(version);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  mockNavigate.mockClear();
  // The `['dashboard', null]` query key is shared by every test in this file (each
  // starts with `selectedSalesUserId === null`) — without clearing the singleton
  // queryClient's cache, the second test's render would serve the first test's
  // still-fresh (staleTime: 30s) cached tiles instead of hitting its own handler.
  queryClient.clear();
});
afterAll(() => server.close());

const me = (permissions: Record<string, string>) => http.get('http://localhost:8000/api/v1/auth/me', () =>
  HttpResponse.json({ id: 'u1', email: 'k@ace.in', name: 'Karthik S', is_superadmin: false, permissions, department_id: null, team_id: null, roles: ['Sales Executive'] }));
// Fixture note: the brief's `${6 + i}` template produces a broken 8th day
// (`2026-08-012`) once i=6 — replaced with an explicit list of seven correct
// ISO dates ending 2026-08-12 (carry-in #4). Assertions are unaffected either
// way since no test asserts on last_7_days content.
const SEVEN_DAYS = ['2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12'];
const dash = (over: Partial<Record<string, unknown>>) => http.get('http://localhost:8000/api/v1/dashboard/sales', () => HttpResponse.json({
  as_of: '2026-08-12', scope: 'own',
  tiles: { today_orders: 1, open_orders: 4, pending_deliveries: 2, payment_pending_count: 2, payment_pending_amount: '104700.00' },
  due: { overdue: 1, due_today: 1, due_this_week: 0 },
  collected_this_month: null, outstanding: null,
  last_7_days: SEVEN_DAYS.map((date, i) => ({ date, orders: i, value: `${i * 1000}.00` })),
  sales_users: [], ...over }));
const recent = http.get('http://localhost:8000/api/v1/sales-orders', () => HttpResponse.json({ items: [{ id: 'o1', number: 'POS-26-27-000041', customer_name: 'Arjun Mehta', net: '2495.00', phase: 'draft', delivery_status: 'not_delivered', payment_status: 'unpaid', reservation_status: 'not_reserved', invoice_status: 'not_invoiced', expected_delivery_date: '2026-08-18', ordered_qty: '5', reserved_qty: '0', delivered_qty: '0', invoiced_qty: '0', paid_amount: '0.00', outstanding: '2495.00', order_date: '2026-08-12', customer_id: 'c1', sales_user_id: 'u1', sales_user_name: 'Karthik S', has_open_shortage: false }], total: 1 }));

test('an executive sees own KPIs, no team chips and no money cards', async () => {
  server.use(me({ 'sales_order.read': 'own' }), dash({}), recent);
  const { findByText, queryByText } = await render(<Providers><HomeScreen /></Providers>);
  expect(await findByText('₹1.05 L')).toBeTruthy();
  expect(await findByText('Hi Karthik')).toBeTruthy();
  expect(queryByText('All teams')).toBeNull();
  expect(queryByText('COLLECTED')).toBeNull();
  expect(await findByText('POS-26-27-000041')).toBeTruthy();
});

test('a head sees team chips, money cards, and re-scopes by chip', async () => {
  const seen: string[] = [];
  server.use(me({ 'sales_order.read': 'all', 'payment.read': 'all' }),
    http.get('http://localhost:8000/api/v1/dashboard/sales', ({ request }) => { seen.push(new URL(request.url).searchParams.get('sales_user_id') ?? ''); return HttpResponse.json({
      as_of: '2026-08-12', scope: 'all', tiles: { today_orders: 3, open_orders: 4, pending_deliveries: 2, payment_pending_count: 2, payment_pending_amount: '99975.00' },
      due: { overdue: 1, due_today: 1, due_this_week: 2 }, collected_this_month: '172460.00', outstanding: { total: '99975.00', overdue: '39800.00' },
      last_7_days: [], sales_users: [{ id: 'u1', name: 'Karthik' }, { id: 'u2', name: 'Divya' }] }); }), recent);
  const { findByText } = await render(<Providers><HomeScreen /></Providers>);
  expect(await findByText('₹1.72 L')).toBeTruthy();
  fireEvent.press(await findByText('Karthik'));
  await findByText('₹1.72 L');
  expect(seen).toContain('u1');
});

test('tapping a tile opens the orders list with its preset', async () => {
  server.use(me({ 'sales_order.read': 'own' }), dash({}), recent);
  const { findByText } = await render(<Providers><HomeScreen /></Providers>);
  fireEvent.press(await findByText('PENDING DELIVERIES'));
  expect(mockNavigate).toHaveBeenCalledWith('Orders', { preset: 'pendingDelivery' });
});

test('"View all" opens the orders list without carrying over a stale preset', async () => {
  server.use(me({ 'sales_order.read': 'own' }), dash({}), recent);
  const { findByText } = await render(<Providers><HomeScreen /></Providers>);
  fireEvent.press(await findByText('VIEW ALL'));
  expect(mockNavigate).toHaveBeenCalledWith('Orders', { preset: undefined });
});
