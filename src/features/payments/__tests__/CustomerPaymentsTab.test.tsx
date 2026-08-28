import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CustomerDetailScreen } from '@/features/customers/screens/CustomerDetailScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { me, paymentListItem } from '@/test/fixtures';

const API = 'http://localhost:8000/api/v1';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: 'c1' } }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
});
afterAll(() => server.close());

const meRoute = (permissions: Record<string, string>) => http.get(`${API}/auth/me`, () => HttpResponse.json(me(permissions)));

const customerTypesRoute = () => http.get(`${API}/customer-types`, () => HttpResponse.json({ items: [], total: 0 }));

const customerRoute = () => http.get(`${API}/customers/c1`, () => HttpResponse.json({
  id: 'c1', code: 'CUST-0001', name: 'Arjun Mehta', customer_type_id: null, customer_group: null, gstin: null,
  gst_reg_type: null, pan: null, state: 'Tamil Nadu', country: 'India', payment_terms_id: null, credit_limit: null,
  default_payment_mode_id: null, notes: null, custom: null, is_active: true,
  contacts: [{ id: 'ct-1', name: 'Arjun Mehta', mobile: '9840122110', email: null, is_primary: true }],
  addresses: [{ id: 'a1', type: 'both', line1: '12 Anna Salai', line2: null, city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', country: 'India', is_default_billing: true, is_default_shipping: true }],
}));

test('Payments tab lists this customer\'s payments, shows outstanding, and Record payment navigates with customerId', async () => {
  server.use(
    meRoute({ 'payment.read': 'all', 'payment.create': 'all' }),
    customerTypesRoute(),
    customerRoute(),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/customers/c1/financial-summary`, () => HttpResponse.json({
      customer_id: 'c1', total_orders: 1, order_value: '5000.00', total_invoiced: '5000.00',
      total_paid: '5000.00', outstanding: '0.00', advance_balance: '0.00',
    })),
    http.get(`${API}/payments`, ({ request }) => {
      expect(new URL(request.url).search).toContain('customer_id=c1');
      return HttpResponse.json({ items: [paymentListItem({ allocated: '5000.00', unallocated: '0.00' })], total: 1 });
    }),
    http.get(`${API}/receivables`, ({ request }) => {
      expect(new URL(request.url).search).toContain('customer_id=c1');
      return HttpResponse.json({ items: [], total: 0, total_outstanding: '250.00' });
    }),
  );

  const { findByText } = await render(<Providers><CustomerDetailScreen /></Providers>);

  await fireEvent.press(await findByText('PAYMENTS'));
  expect(await findByText('PMT-26-27-000012')).toBeTruthy();
  // `Text variant="label"` auto-uppercases (see `ui/Text.tsx`).
  expect(await findByText('OUTSTANDING ₹250.00')).toBeTruthy();

  await fireEvent.press(await findByText('PMT-26-27-000012'));
  expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' });

  await fireEvent.press(await findByText('RECORD PAYMENT'));
  expect(mockNavigate).toHaveBeenCalledWith('RecordPayment', { customerId: 'c1' });
});

test('Payments tab: no payments yet shows an empty state, and no Record payment button without payment.create', async () => {
  server.use(
    meRoute({}),
    customerTypesRoute(),
    customerRoute(),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/payments`, () => HttpResponse.json({ items: [], total: 0 })),
  );

  const { findByText, queryByText } = await render(<Providers><CustomerDetailScreen /></Providers>);
  await fireEvent.press(await findByText('PAYMENTS'));

  expect(await findByText('No payments yet')).toBeTruthy();
  expect(queryByText('RECORD PAYMENT')).toBeNull();
});

test('Payments tab: an error state offers RETRY', async () => {
  // 404, not 500 — the shared query client auto-retries 5xx/network/timeout
  // (see `lib/query/client.ts`), so only a 4xx reliably stays failed until
  // the rep presses RETRY themselves.
  let calls = 0;
  server.use(
    meRoute({ 'payment.create': 'all' }),
    customerTypesRoute(),
    customerRoute(),
    http.get(`${API}/sales-orders`, () => HttpResponse.json({ items: [], total: 0 })),
    http.get(`${API}/payments`, () => {
      calls += 1;
      if (calls === 1) return HttpResponse.json({ detail: 'Not Found' }, { status: 404 });
      return HttpResponse.json({ items: [paymentListItem({ allocated: '5000.00', unallocated: '0.00' })], total: 1 });
    }),
  );

  const { findByText, queryByText } = await render(<Providers><CustomerDetailScreen /></Providers>);
  await fireEvent.press(await findByText('PAYMENTS'));

  await waitFor(() => expect(queryByText('RETRY')).toBeTruthy());
  await fireEvent.press(await findByText('RETRY'));
  await waitFor(() => expect(queryByText('PMT-26-27-000012')).toBeTruthy());
});
