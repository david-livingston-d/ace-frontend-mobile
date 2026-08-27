import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { useOrderDraft } from '@/features/orders/store/draft';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import type { LineSnapshot } from '@/features/products/types';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  useOrderDraft.getState().reset();
});
afterAll(() => server.close());

const ME = {
  id: 'u1', email: 'admin@ace.local', name: 'Admin', is_superadmin: true,
  permissions: {}, department_id: null, team_id: null, roles: [],
};

const CUSTOMER = {
  id: 'c1', code: 'CUS-0001', name: 'Arjun Mehta', customer_type_id: 'ct1', customer_group: null,
  gstin: null, gst_reg_type: null, pan: null, state: 'TN', country: 'IN', payment_terms_id: 'pt1',
  credit_limit: null, default_payment_mode_id: null, notes: null, custom: null, is_active: true,
};

const CUSTOMER_DETAIL = {
  ...CUSTOMER,
  contacts: [],
  addresses: [{
    id: 'a1', type: 'both', line1: '1 MG Road', line2: null, city: 'Chennai', state: 'TN',
    pincode: '600001', country: 'IN', is_default_billing: true, is_default_shipping: true,
  }],
};

const CREATED = {
  id: 'o9', number: 'POS-26-27-000043', customer_id: 'c1', customer_name: 'Arjun Mehta',
  customer_gstin: null, billing_address: { id: 'a1' }, shipping_address: { id: 'a1' },
  place_of_supply_state: 'TN', payment_terms_id: 'pt1', payment_terms_name: 'Net 30',
  payment_terms_days: 30, sales_user_id: 'u1', sales_user_name: 'Admin', department_id: null,
  team_id: null, warehouse_id: 'w1', warehouse_name: 'Main', order_date: '2026-08-27',
  expected_delivery_date: null, remarks: null, order_discount_pct: '0', gross: '9980.00',
  line_discount: '0.00', order_discount: '0.00', taxable: '9980.00', tax: '1197.60',
  net: '11177.60', phase: 'draft', reservation_status: 'not_reserved',
  delivery_status: 'not_delivered', invoice_status: 'not_invoiced', payment_status: 'unpaid',
  verified_by: null, verified_by_name: null, verified_at: null, cancelled_by: null,
  cancelled_at: null, cancel_reason: null, closed_by: null, closed_at: null, close_reason: null,
  created_by: 'u1', created_at: '2026-08-27T10:00:00Z',
  summary: {
    order_value: '11177.60', advance_received: '0.00', delivered_value: '0.00',
    invoiced_value: '0.00', paid_amount: '0.00', outstanding: '11177.60',
  },
  lines: [], reservations: [], delivery_notes: [], invoices: [], payments: [], shortages: [],
  warnings: [],
};

const baseHandlers = () => [
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(ME)),
  http.get('http://localhost:8000/api/v1/customers', () => HttpResponse.json({ items: [CUSTOMER], total: 1 })),
  http.get('http://localhost:8000/api/v1/customers/c1', () => HttpResponse.json(CUSTOMER_DETAIL)),
  http.get('http://localhost:8000/api/v1/customers/c1/financial-summary', () =>
    HttpResponse.json({ outstanding: '0.00', advance_balance: '0.00', total_paid: '0.00', order_value: '0.00', credit_limit: null, overdue_amount: '0.00' })),
  http.get('http://localhost:8000/api/v1/customer-types', () => HttpResponse.json({ items: [{ id: 'ct1', name: 'Retail', is_active: true }], total: 1 })),
  http.get('http://localhost:8000/api/v1/payment-terms', () => HttpResponse.json({ items: [{ id: 'pt1', name: 'Net 30', days: 30, is_active: true }], total: 1 })),
  http.get('http://localhost:8000/api/v1/categories', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/products', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/variants', () => HttpResponse.json({ items: [], total: 0 })),
];

const snap = (sku: string): LineSnapshot => ({
  sku, productId: 'p1', productName: 'Classic Tee', variantLabel: 'Black / M',
  attributeValues: [], taxRate: '12', price: { sellingPrice: '499.00', taxInclusive: false }, stock: null,
});

function seedDraft() {
  const s = useOrderDraft.getState();
  s.setCustomer({ id: 'c1', name: 'Arjun Mehta', code: 'CUS-0001', addresses: CUSTOMER_DETAIL.addresses, paymentTermsId: 'pt1' });
  s.addLines([
    { variantId: 'v1', qty: 12, snapshot: snap('WH-TEE-BLK-M') },
    { variantId: 'v2', qty: 8, snapshot: { ...snap('WH-TEE-BLK-L'), variantLabel: 'Black / L' } },
  ]);
}

const Stack = createNativeStackNavigator();

async function renderWizard() {
  const navRef = createNavigationContainerRef<Record<string, object | undefined>>();
  const utils = await render(
    <Providers>
      <NavigationContainer ref={navRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="NewOrder" component={NewOrderScreen} />
          <Stack.Screen name="OrderDetail">{() => <Text>Order detail stub</Text>}</Stack.Screen>
          <Stack.Screen name="RecordPayment">{() => <Text>Record payment stub</Text>}</Stack.Screen>
          <Stack.Screen name="CustomerSearch">{() => <Text>Customer search stub</Text>}</Stack.Screen>
          <Stack.Screen name="CustomerCreate">{() => <Text>Customer create stub</Text>}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  return { ...utils, navRef };
}

// The wizard is always *pushed on top of* the tab bar in the real app, never
// the root stack's first route — which is what makes an unhandled navigation
// action escaping the nested stack visible at all. A `popToTop()` dispatched
// while the wizard is already on its first step is not handled by the wizard's
// own stack, so React Navigation bubbles it to the root stack, which pops the
// wizard away entirely the instant it opens.
test('entering the wizard over the tabs stays in the wizard', async () => {
  server.use(...baseHandlers());
  const navRef = createNavigationContainerRef<Record<string, object | undefined>>();
  const { findByText } = await render(
    <Providers>
      <NavigationContainer ref={navRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs">{() => <Text>Home tab</Text>}</Stack.Screen>
          <Stack.Screen name="NewOrder" component={NewOrderScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Providers>,
  );

  expect(await findByText('Home tab')).toBeTruthy();
  await act(async () => {
    navRef.navigate('NewOrder', {});
  });

  expect(await findByText('STEP 1 OF 4')).toBeTruthy();
  await waitFor(() => expect(navRef.getCurrentRoute()?.name).toBe('CustomerStep'));
});

test('the customer step blocks Continue until a customer is picked, then lands on products', async () => {
  server.use(...baseHandlers());
  const { findByText, getByText } = await renderWizard();

  expect(await findByText('STEP 1 OF 4')).toBeTruthy();
  // Nothing picked yet: pressing Continue must not advance.
  fireEvent.press(getByText('CONTINUE'));
  expect(getByText('STEP 1 OF 4')).toBeTruthy();

  fireEvent.press(await findByText('Arjun Mehta'));
  await waitFor(() => expect(useOrderDraft.getState().customer?.id).toBe('c1'));

  fireEvent.press(getByText('CONTINUE'));
  expect(await findByText('STEP 2 OF 4')).toBeTruthy();
});

test('review confirms the order, posts null rates for untouched lines and lands on success', async () => {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    ...baseHandlers(),
    http.post('http://localhost:8000/api/v1/sales-orders', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(CREATED, { status: 201 });
    }),
  );
  seedDraft();
  const { findByText, getByText, findByLabelText, navRef } = await renderWizard();

  fireEvent.press(await findByText('CONTINUE'));
  expect(await findByText('STEP 2 OF 4')).toBeTruthy();

  fireEvent.press(await findByLabelText('View order draft'));
  expect(await findByText('STEP 3 OF 4')).toBeTruthy();
  expect(getByText('20 units · 2 lines')).toBeTruthy();

  fireEvent.press(getByText('REVIEW ORDER'));
  expect(await findByText('STEP 4 OF 4')).toBeTruthy();

  fireEvent.press(getByText('CONFIRM ORDER'));
  expect(await findByText('Order POS-26-27-000043 created')).toBeTruthy();

  expect(bodies).toHaveLength(1);
  const lines = bodies[0]!.lines as { variant_id: string; rate: string | null; qty: string }[];
  expect(lines[0]!.rate).toBeNull();
  expect(lines[0]!.qty).toBe('12');
  expect(bodies[0]!.order_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // A confirmed order leaves nothing behind to re-submit.
  expect(useOrderDraft.getState().lines).toEqual({});

  fireEvent.press(getByText('VIEW ORDER'));
  await waitFor(() => expect(navRef.getCurrentRoute()?.name).toBe('OrderDetail'));
  expect(navRef.getCurrentRoute()?.params).toEqual({ id: 'o9' });
});

test('record payment now jumps to the payment placeholder for the new order', async () => {
  server.use(
    ...baseHandlers(),
    http.post('http://localhost:8000/api/v1/sales-orders', () => HttpResponse.json(CREATED, { status: 201 })),
  );
  seedDraft();
  const { findByText, getByText, findByLabelText, navRef } = await renderWizard();

  fireEvent.press(await findByText('CONTINUE'));
  fireEvent.press(await findByLabelText('View order draft'));
  fireEvent.press(await findByText('REVIEW ORDER'));
  fireEvent.press(await findByText('CONFIRM ORDER'));
  expect(await findByText('Order POS-26-27-000043 created')).toBeTruthy();

  fireEvent.press(getByText('RECORD PAYMENT NOW'));
  await waitFor(() => expect(navRef.getCurrentRoute()?.name).toBe('RecordPayment'));
  expect(navRef.getCurrentRoute()?.params).toEqual({ orderId: 'o9' });
});

test('a 403 rate_override_required with row_index 1 sends the user back to the second cart line', async () => {
  server.use(
    ...baseHandlers(),
    http.post('http://localhost:8000/api/v1/sales-orders', () =>
      HttpResponse.json(
        { detail: { code: 'rate_override_required', message: 'Missing permission sales_order.rate_override', row_index: 1 } },
        { status: 403 },
      )),
  );
  seedDraft();
  const { findByText, findByLabelText, findByTestId, queryByTestId } = await renderWizard();

  fireEvent.press(await findByText('CONTINUE'));
  fireEvent.press(await findByLabelText('View order draft'));
  fireEvent.press(await findByText('REVIEW ORDER'));
  fireEvent.press(await findByText('CONFIRM ORDER'));

  // Back on the cart, with the offending line (the second) carrying the message.
  expect(await findByText('STEP 3 OF 4')).toBeTruthy();
  const flagged = await findByTestId('cart-line-error-v2');
  expect(flagged).toHaveTextContent(/rate override permission/);
  // ...and only that line: the first one is untouched by `row_index: 1`.
  expect(queryByTestId('cart-line-error-v1')).toBeNull();
});
