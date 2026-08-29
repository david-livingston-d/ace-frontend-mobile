// Segmented-control labels render uppercase (`Text variant="chip"`).
import React, { useState } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { PaymentsTabScreen } from '@/features/payments/screens/PaymentsTabScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { usePaymentFilters } from '@/store/filters';
import { me, paymentListItem, receivableRow as receivableRowFixture } from '@/test/fixtures';

const API = 'http://localhost:8000/api/v1';

const mockNavigate = jest.fn();
let mockRouteParams: { view?: string } | undefined;
let mockForceRerender: (() => void) | undefined;
// A real `setParams` that merges into `mockRouteParams` and produces a
// brand-new object each time (exactly what `@react-navigation/routers`'
// `BaseRouter` does for `SET_PARAMS`), deferred to a microtask — same
// contract `OrdersListScreen.test.tsx`'s own harness drives, and for the
// same reason: a synchronous call here would update a component while
// rendering a different one.
const mockSetParams = jest.fn((patch: Record<string, unknown>) => {
  mockRouteParams = { ...(mockRouteParams ?? {}), ...patch };
  Promise.resolve().then(() => mockForceRerender?.());
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }),
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (cb: () => void) => cb(),
}));

// Drives a real second render with a fresh (but still-mutated-in-place)
// `mockRouteParams`, the same way `OrdersListScreen.test.tsx`'s own harness
// exercises the "consume the route param once" path — see that file's
// comment for why a plain synchronous mutation isn't enough on its own.
function RouteParamsHarness() {
  const [, bump] = useState(0);
  mockForceRerender = () => bump((n) => n + 1);
  return <PaymentsTabScreen />;
}

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  usePaymentFilters.getState().reset();
  mockNavigate.mockClear();
  mockSetParams.mockClear();
  mockRouteParams = undefined;
  mockForceRerender = undefined;
});
afterAll(() => server.close());

const meRoute = (permissions: Record<string, string>) => http.get(`${API}/auth/me`, () => HttpResponse.json(me(permissions)));

const order = (over: Record<string, unknown> = {}) => ({
  id: 'o1', number: 'POS-26-27-000041', customer_id: 'c1', customer_name: 'Arjun Mehta',
  sales_user_id: 'u1', sales_user_name: 'Karthik S', order_date: '2026-08-12', expected_delivery_date: '2026-08-18',
  net: '2495.00', ordered_qty: '5', reserved_qty: '0', delivered_qty: '0', invoiced_qty: '0',
  paid_amount: '0.00', outstanding: '2495.00', phase: 'payment_pending', reservation_status: 'fully_reserved',
  delivery_status: 'fully_delivered', invoice_status: 'fully_invoiced', payment_status: 'unpaid', has_open_shortage: false,
  ...over,
});

const modesRoute = () => http.get(`${API}/payment-modes`, () => HttpResponse.json({
  items: [{ id: 'pm1', name: 'Cash', is_active: true }, { id: 'pm2', name: 'UPI', is_active: true }],
  total: 2,
}));

test('shows three chips defaulting to By order, which requests open=true&outstanding_only=true', async () => {
  const queries: string[] = [];
  server.use(
    meRoute({ 'sales_order.read': 'own' }),
    http.get(`${API}/sales-orders`, ({ request }) => {
      queries.push(new URL(request.url).search);
      return HttpResponse.json({ items: [order()], total: 1 });
    }),
  );

  const { findByText } = await render(<Providers><PaymentsTabScreen /></Providers>);

  expect(await findByText('BY ORDER')).toBeTruthy();
  expect(await findByText('BY CUSTOMER')).toBeTruthy();
  expect(await findByText('HISTORY')).toBeTruthy();
  expect(await findByText('POS-26-27-000041')).toBeTruthy();
  await waitFor(() => expect(queries[0]).toContain('open=true'));
  expect(queries[0]).toContain('outstanding_only=true');
});

test('By order: tapping a row opens OrderDetail, Pay opens RecordPayment prefilled', async () => {
  server.use(
    meRoute({ 'sales_order.read': 'own', 'payment.create': 'all' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [order()], total: 1 })),
  );

  const { findByText } = await render(<Providers><PaymentsTabScreen /></Providers>);

  await fireEvent.press(await findByText('PAY'));
  expect(mockNavigate).toHaveBeenCalledWith('RecordPayment', { orderId: 'o1', customerId: 'c1' });

  await fireEvent.press(await findByText('POS-26-27-000041'));
  expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { id: 'o1' });
});

test('By order: without payment.create, no Pay action is offered', async () => {
  server.use(
    meRoute({ 'sales_order.read': 'own' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [order()], total: 1 })),
  );

  const { findByText, queryByText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  expect(await findByText('POS-26-27-000041')).toBeTruthy();
  expect(queryByText('PAY')).toBeNull();
});

test('By customer: groups two invoices of one customer into one row with summed outstanding, and a total header', async () => {
  server.use(
    meRoute({ 'payment.read': 'all' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/receivables`, () =>
      HttpResponse.json({
        items: [
          receivableRowFixture({ invoice_id: 'i1', outstanding: '1000.00', days_overdue: 0 }),
          receivableRowFixture({ invoice_id: 'i2', outstanding: '250.00', days_overdue: 3 }),
        ],
        total: 2,
        total_outstanding: '1250.00',
      })),
  );

  const { findByText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  await fireEvent.press(await findByText('BY CUSTOMER'));

  // `Text variant="label"` auto-uppercases (see `ui/Text.tsx`) — same
  // treatment `FinancialSummary`'s "OUTSTANDING"/"TOTAL PAID" tiles get.
  expect(await findByText('TOTAL OUTSTANDING ₹1,250.00')).toBeTruthy();
  expect(await findByText('Arjun Mehta')).toBeTruthy();
  expect(await findByText('₹1,250.00')).toBeTruthy();
  // Two invoices collapsed into one row's subtitle, one of them overdue.
  expect(await findByText(/2 invoices · overdue ₹250\.00/)).toBeTruthy();

  await fireEvent.press(await findByText('Arjun Mehta'));
  expect(mockNavigate).toHaveBeenCalledWith('CustomerDetail', { id: 'c1' });
});

test('By customer: empty receivables shows an empty state', async () => {
  server.use(
    meRoute({ 'payment.read': 'all' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/receivables`, () => HttpResponse.json({ items: [], total: 0, total_outstanding: '0.00' })),
  );

  const { findByText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  await fireEvent.press(await findByText('BY CUSTOMER'));
  expect(await findByText('Nothing outstanding')).toBeTruthy();
});

test('History: search debounces, filter sheet applies payment_mode_id, and a row opens PaymentDetail', async () => {
  const queries: string[] = [];
  server.use(
    meRoute({ 'payment.read': 'all', 'payment_modes.read': 'all' }),
    modesRoute(),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/payments`, ({ request }) => {
      queries.push(new URL(request.url).search);
      return HttpResponse.json({ items: [paymentListItem()], total: 1 });
    }),
  );

  const { findByText, findByLabelText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  await fireEvent.press(await findByText('HISTORY'));

  expect(await findByText('PMT-26-27-000012')).toBeTruthy();
  await waitFor(() => expect(queries.length).toBeGreaterThan(0));

  await fireEvent.press(await findByLabelText('Filters'));
  // The mode field is a `Select` (not a chip row) — opening it presents its
  // own nested sheet of options, same as `RecordPaymentScreen`'s own mode
  // picker above four active modes.
  await fireEvent.press(await findByLabelText('Mode'));
  await fireEvent.press(await findByText('UPI'));
  await fireEvent.press(await findByText('APPLY FILTERS'));

  await waitFor(() => expect(queries.some((q) => q.includes('payment_mode_id=pm2'))).toBe(true));
  expect(await findByText('UPI')).toBeTruthy(); // active filter chip

  await fireEvent.press(await findByText('PMT-26-27-000012'));
  expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' });
});

test('History: an unallocated payment shows its unallocated figure', async () => {
  server.use(
    meRoute({ 'payment.read': 'all', 'payment_modes.read': 'all' }),
    modesRoute(),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/payments`, () => HttpResponse.json({ items: [paymentListItem({ unallocated: '2000.00' })], total: 1 })),
  );

  const { findByText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  await fireEvent.press(await findByText('HISTORY'));
  expect(await findByText('₹2,000.00')).toBeTruthy();
});

test('Record payment header action is gated on payment.create and opens RecordPayment with no params', async () => {
  server.use(
    meRoute({ 'sales_order.read': 'own', 'payment.create': 'all' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
  );

  const { findByLabelText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  await fireEvent.press(await findByLabelText('Record payment'));
  expect(mockNavigate).toHaveBeenCalledWith('RecordPayment', {});
});

test('without payment.create, no Record payment action is rendered', async () => {
  server.use(meRoute({ 'sales_order.read': 'own' }), http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })));
  const { queryByLabelText, findByText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  expect(await findByText('BY ORDER')).toBeTruthy();
  expect(queryByLabelText('Record payment')).toBeNull();
});

// Dashboard's OUTSTANDING KPI navigates in with `{ view: 'customers' }` —
// consumed once (and cleared) the same way `OrdersListScreen` consumes its
// own route preset, so switching tabs and back doesn't replay it.
test('a route view param opens directly on By customer and is consumed once', async () => {
  mockRouteParams = { view: 'customers' };
  server.use(
    meRoute({ 'payment.read': 'all' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/receivables`, () => HttpResponse.json({ items: [], total: 0, total_outstanding: '0.00' })),
  );

  const { findByText } = await render(<Providers><RouteParamsHarness /></Providers>);

  expect(await findByText('Nothing outstanding')).toBeTruthy();
  expect(mockSetParams).toHaveBeenCalledWith({ view: undefined });
});

// M4-T8: both pending views are `RowCard`s carrying a metrics strip, so the
// money a rep is chasing is on the row rather than one tap away — and so the
// card skeleton that precedes them has the same shape as what arrives.
test('By order: each row carries a Value / Paid / Outstanding metrics strip', async () => {
  server.use(
    meRoute({ 'sales_order.read': 'own' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [order({ paid_amount: '495.00', outstanding: '2000.00' })], total: 1 })),
  );

  const { findByText, getByText } = await render(<Providers><PaymentsTabScreen /></Providers>);

  expect(await findByText('POS-26-27-000041')).toBeTruthy();
  // `Text variant="label"` auto-uppercases (see `ui/Text.tsx`).
  expect(getByText('VALUE')).toBeTruthy();
  expect(getByText('PAID')).toBeTruthy();
  expect(getByText('OUTSTANDING')).toBeTruthy();
  expect(getByText('₹2,495.00')).toBeTruthy();
  expect(getByText('₹495.00')).toBeTruthy();
  expect(getByText('₹2,000.00')).toBeTruthy();
  // The customer and the committed date share the row's meta line.
  expect(getByText('Arjun Mehta · due 18 Aug 2026')).toBeTruthy();
});

test('By customer: each row carries a Billed / Paid / Outstanding metrics strip', async () => {
  server.use(
    meRoute({ 'payment.read': 'all' }),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/receivables`, () =>
      HttpResponse.json({
        items: [
          receivableRowFixture({ invoice_id: 'i1', net: '1000.00', paid_amount: '250.00', outstanding: '750.00' }),
          receivableRowFixture({ invoice_id: 'i2', net: '500.00', paid_amount: '0.00', outstanding: '500.00' }),
        ],
        total: 2,
        total_outstanding: '1250.00',
      })),
  );

  const { findByText, getByText } = await render(<Providers><PaymentsTabScreen /></Providers>);
  await fireEvent.press(await findByText('BY CUSTOMER'));

  expect(await findByText('Arjun Mehta')).toBeTruthy();
  expect(getByText('BILLED')).toBeTruthy();
  expect(getByText('PAID')).toBeTruthy();
  expect(getByText('OUTSTANDING')).toBeTruthy();
  expect(getByText('₹1,500.00')).toBeTruthy();
  expect(getByText('₹250.00')).toBeTruthy();
  expect(getByText('₹1,250.00')).toBeTruthy();
});
