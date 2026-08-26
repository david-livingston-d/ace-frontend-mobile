import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { OrdersListScreen } from '@/features/orders/screens/OrdersListScreen';
import { Providers } from '@/providers';
import { useOrderFilters } from '@/store/filters';
import { queryClient } from '@/lib/query/client';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: mockNavigate, setParams: jest.fn() }), useRoute: () => ({ params: undefined }), useFocusEffect: (cb: () => void) => cb() }));
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); queryClient.clear(); useOrderFilters.getState().reset(); mockNavigate.mockClear(); });
afterAll(() => server.close());

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
