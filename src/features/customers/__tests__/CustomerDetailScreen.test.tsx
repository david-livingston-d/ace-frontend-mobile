import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CustomerDetailScreen } from '@/features/customers/screens/CustomerDetailScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';

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

const me = (permissions: Record<string, string>) =>
  http.get('http://localhost:8000/api/v1/auth/me', () =>
    HttpResponse.json({
      id: 'u1', email: 'k@ace.in', name: 'Karthik S', is_superadmin: false,
      permissions, department_id: null, team_id: null, roles: [],
    }));

const customerTypes = () =>
  http.get('http://localhost:8000/api/v1/customer-types', () =>
    HttpResponse.json({ items: [{ id: 'ct1', name: 'Retail', is_active: true }], total: 1 }));

const customer = () =>
  http.get('http://localhost:8000/api/v1/customers/c1', () =>
    HttpResponse.json({
      id: 'c1', code: 'CUST-0001', name: 'Urban Threads Retail', customer_type_id: 'ct1',
      customer_group: null, gstin: null, gst_reg_type: null, pan: null, state: 'Tamil Nadu',
      country: 'India', payment_terms_id: null, credit_limit: null, default_payment_mode_id: null,
      notes: null, custom: null, is_active: true,
      contacts: [{ id: 'ct-1', name: 'Urban Threads Retail', mobile: '9840122110', email: null, is_primary: true }],
      addresses: [{ id: 'a1', type: 'both', line1: '12 Anna Salai', line2: null, city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', country: 'India', is_default_billing: true, is_default_shipping: true }],
    }));

const order = (id: string, number: string) => ({
  id, number, customer_id: 'c1', customer_name: 'Urban Threads Retail', sales_user_id: 'u1', sales_user_name: 'Karthik S',
  order_date: '2026-08-12', expected_delivery_date: '2026-08-18', net: '2495.00', ordered_qty: '5', reserved_qty: '0',
  delivered_qty: '0', invoiced_qty: '0', paid_amount: '0.00', outstanding: '2495.00', phase: 'draft',
  reservation_status: 'not_reserved', delivery_status: 'not_delivered', invoice_status: 'not_invoiced',
  payment_status: 'unpaid', has_open_shortage: false,
});

test('renders name/type/phone/city and financial summary cards when payment.read is held', async () => {
  server.use(
    me({ 'payment.read': 'all', 'sales_order.create': 'own' }),
    customerTypes(),
    customer(),
    http.get('http://localhost:8000/api/v1/customers/c1/financial-summary', () =>
      HttpResponse.json({
        customer_id: 'c1', total_orders: 4, order_value: '99800.00', total_invoiced: '80000.00',
        total_paid: '60000.00', outstanding: '20000.00', advance_balance: '0.00',
      })),
    http.get('http://localhost:8000/api/v1/sales-orders', ({ request }) => {
      expect(new URL(request.url).search).toContain('customer_id=c1');
      return HttpResponse.json({ items: [order('o1', 'POS-26-27-000041')], total: 1 });
    }),
  );

  const { findByText, findAllByText } = await render(
    <Providers>
      <CustomerDetailScreen />
    </Providers>,
  );

  // The screen header and the body card both show the name — either is
  // enough to confirm it rendered.
  expect((await findAllByText('Urban Threads Retail')).length).toBeGreaterThan(0);
  expect(await findByText('RETAIL')).toBeTruthy(); // StatusChip's label auto-uppercases
  expect(await findByText('9840122110')).toBeTruthy();
  expect(await findByText('Chennai')).toBeTruthy();
  expect(await findByText('OUTSTANDING')).toBeTruthy();

  expect(await findByText('POS-26-27-000041')).toBeTruthy();

  await fireEvent.press(await findByText('NEW ORDER FOR THIS CUSTOMER'));
  expect(mockNavigate).toHaveBeenCalledWith('NewOrder', { customerId: 'c1' });
});

test('without payment.read, a 403 on financial-summary hides the cards without an error state', async () => {
  server.use(
    me({}),
    customerTypes(),
    customer(),
    http.get('http://localhost:8000/api/v1/customers/c1/financial-summary', () =>
      HttpResponse.json({ detail: { code: 'forbidden', message: 'no' } }, { status: 403 })),
    http.get('http://localhost:8000/api/v1/sales-orders', () => HttpResponse.json({ items: [], total: 0 })),
  );

  const { findAllByText, queryByText } = await render(
    <Providers>
      <CustomerDetailScreen />
    </Providers>,
  );

  expect((await findAllByText('Urban Threads Retail')).length).toBeGreaterThan(0);
  expect(queryByText('OUTSTANDING')).toBeNull();
  expect(queryByText('RETRY')).toBeNull();
});
