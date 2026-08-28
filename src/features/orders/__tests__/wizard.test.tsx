import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { SuccessScreen } from '@/features/orders/screens/wizard/SuccessScreen';
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

// A Sales Executive as the seed actually grants them: orders within their own
// scope, and neither override. Superadmin short-circuits `hasPermission`, so
// the permission *codes* are only really exercised by a user like this one.
const ME_REP = {
  id: 'u2', email: 'rep@ace.local', name: 'Sales Rep', is_superadmin: false,
  permissions: { 'sales_order.read': 'own', 'sales_order.create': 'own', 'sales_order.update': 'own' },
  department_id: null, team_id: null, roles: [{ id: 'r1', name: 'Sales Executive' }],
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

const baseHandlers = (me: typeof ME | typeof ME_REP = ME) => [
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(me)),
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
        <Stack.Navigator initialRouteName="NewOrder" screenOptions={{ headerShown: false }}>
          {/* A confirmed order resets the *root* stack to `[Tabs,
              OrderSuccess]` (see `ReviewStep.confirm`), so both of those
              routes have to exist here for the wizard's own tests to follow
              the order past its last step. `fresh` suppresses the
              "Resume draft?" prompt: these tests seed the draft store
              themselves and are not about that prompt. */}
          <Stack.Screen name="Tabs">{() => <Text>Tabs stub</Text>}</Stack.Screen>
          <Stack.Screen name="NewOrder" component={NewOrderScreen} initialParams={{ fresh: true }} />
          <Stack.Screen name="OrderSuccess" component={SuccessScreen} />
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
  // The counterpart to the rep's cart below: a superadmin *does* get the rate
  // pencil and the discount box, so their absence there means the permission
  // gate, not a mistyped label.
  expect(await findByLabelText('Edit rate for WH-TEE-BLK-M')).toBeTruthy();
  expect(await findByLabelText('Discount % for WH-TEE-BLK-M')).toBeTruthy();

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

// C1: the wizard's footer buttons are `Pressable`s, and pressing one does not
// blur a focused `TextInput` — so a rate and a discount typed and then
// "Review order"ed in the same breath used to never reach the draft at all,
// and the order was created at the list price with no discount. Deliberately
// no `fireEvent(input, 'blur')` anywhere below: that is the whole point.
test('a rate and a discount typed straight before Review reach the payload without any blur', async () => {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    ...baseHandlers(),
    http.post('http://localhost:8000/api/v1/sales-orders', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(CREATED, { status: 201 });
    }),
  );
  seedDraft();
  const { findByText, getByText, findByLabelText } = await renderWizard();

  fireEvent.press(await findByText('CONTINUE'));
  fireEvent.press(await findByLabelText('View order draft'));
  expect(await findByText('STEP 3 OF 4')).toBeTruthy();

  await fireEvent.press(await findByLabelText('Edit rate for WH-TEE-BLK-M'));
  await fireEvent.changeText(await findByLabelText('Rate for WH-TEE-BLK-M'), '450');
  await fireEvent.changeText(await findByLabelText('Discount % for WH-TEE-BLK-M'), '10');

  await fireEvent.press(getByText('REVIEW ORDER'));
  expect(await findByText('STEP 4 OF 4')).toBeTruthy();
  await fireEvent.press(getByText('CONFIRM ORDER'));
  expect(await findByText('Order POS-26-27-000043 created')).toBeTruthy();

  expect(bodies).toHaveLength(1);
  const lines = bodies[0]!.lines as { variant_id: string; rate: string | null; discount_pct: string }[];
  expect(lines[0]).toMatchObject({ variant_id: 'v1', rate: '450.00', discount_pct: '10' });
  // ...and only that line: the untouched second one still lets the server price it.
  expect(lines[1]).toMatchObject({ variant_id: 'v2', rate: null, discount_pct: '0' });
});

test('record payment now opens the payment form for the new order and its customer', async () => {
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
  // The customer travels with the order (M3 Task 3) so the payment form has
  // both without waiting on its own order fetch.
  expect(navRef.getCurrentRoute()?.params).toEqual({ orderId: 'o9', customerId: 'c1' });
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

  // And it goes once the user acts on it: the message described a payload that
  // no longer exists, so leaving it in red would be the app lying about the
  // draft in front of them.
  fireEvent.press(await findByLabelText('Increase Quantity for WH-TEE-BLK-L'));
  await waitFor(() => expect(queryByTestId('cart-line-error-v2')).toBeNull());
});

// The permission matrix, from the DOM out: without `sales_order.rate_override`
// there is no pencil to tap, and without `sales_order.discount_override` there
// is no percent box — on any row or on the header. What reaches the API for
// such a caller is `rate: null` (let the server price it) and `discount_pct:
// '0'` (nothing here could have set anything else).
test('a rep without the override permissions gets no rate or discount fields, and posts neither', async () => {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    ...baseHandlers(ME_REP),
    http.post('http://localhost:8000/api/v1/sales-orders', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(CREATED, { status: 201 });
    }),
  );
  seedDraft();
  const { findByText, findByLabelText, queryByLabelText, queryByText } = await renderWizard();

  fireEvent.press(await findByText('CONTINUE'));
  fireEvent.press(await findByLabelText('View order draft'));
  expect(await findByText('STEP 3 OF 4')).toBeTruthy();

  // The rate is text, not a control; the discount box and the order-level one
  // aren't rendered at all.
  expect(queryByLabelText('Edit rate for WH-TEE-BLK-M')).toBeNull();
  expect(queryByLabelText('Edit rate for WH-TEE-BLK-L')).toBeNull();
  expect(queryByLabelText('Discount % for WH-TEE-BLK-M')).toBeNull();
  expect(queryByLabelText('Discount % for WH-TEE-BLK-L')).toBeNull();
  expect(queryByLabelText('Discount % for order')).toBeNull();
  expect(queryByText('Order discount %')).toBeNull();

  fireEvent.press(await findByText('REVIEW ORDER'));
  fireEvent.press(await findByText('CONFIRM ORDER'));
  expect(await findByText('Order POS-26-27-000043 created')).toBeTruthy();

  const lines = bodies[0]!.lines as { rate: string | null; discount_pct: string }[];
  expect(lines).toHaveLength(2);
  for (const line of lines) {
    expect(line.rate).toBeNull();
    expect(line.discount_pct).toBe('0');
  }
  expect(bodies[0]!.order_discount_pct).toBe('0');
});

// An order-level refusal carries no `row_index` — there is no row to blame —
// so it has to be readable where the user is standing rather than becoming a
// toast that scrolls away.
test('a 403 discount_override_required with no row_index stays on review as a banner', async () => {
  server.use(
    ...baseHandlers(ME_REP),
    http.post('http://localhost:8000/api/v1/sales-orders', () =>
      HttpResponse.json(
        { detail: { code: 'discount_override_required', message: 'Missing permission sales_order.discount_override' } },
        { status: 403 },
      )),
  );
  seedDraft();
  const { findByText, findAllByText, findByLabelText } = await renderWizard();

  fireEvent.press(await findByText('CONTINUE'));
  fireEvent.press(await findByLabelText('View order draft'));
  fireEvent.press(await findByText('REVIEW ORDER'));
  fireEvent.press(await findByText('CONFIRM ORDER'));

  // Twice over, deliberately: the toast that announces it, and the banner on
  // the review screen that is still there once the toast has gone.
  const shown = await findAllByText(
    'That discount needs the discount override permission — ask a sales head to save it.',
  );
  expect(shown.length).toBeGreaterThanOrEqual(2);
  // Still on the review step: nothing was silently re-shaped and retried.
  expect(await findByText('STEP 4 OF 4')).toBeTruthy();
});

// M4-T7 (frames `wizard-1-empty` / `wizard-1-picked`): step 1 *is* the customer
// register until a customer is chosen; once one is, the register is replaced by
// the summary card, whose own ghost action is the only way back to the list.
test('step 1 shows the inline customer picker, then the summary card with "Change customer"', async () => {
  server.use(...baseHandlers());
  const { findByText, queryByText, getByPlaceholderText } = await renderWizard();

  expect(await findByText('STEP 1 OF 4')).toBeTruthy();
  expect(getByPlaceholderText('Search customer name or phone')).toBeTruthy();
  expect(await findByText('CREATE NEW CUSTOMER')).toBeTruthy();
  expect(queryByText('CHANGE CUSTOMER')).toBeNull();

  fireEvent.press(await findByText('Arjun Mehta'));

  // The picked customer's card replaces the register outright.
  expect(await findByText('CHANGE CUSTOMER')).toBeTruthy();
  await waitFor(() => expect(queryByText('CREATE NEW CUSTOMER')).toBeNull());

  // ...and the ghost action inside the card puts the register back.
  fireEvent.press(await findByText('CHANGE CUSTOMER'));
  expect(await findByText('CREATE NEW CUSTOMER')).toBeTruthy();
});

// The totals card is the same client mirror of the calculation engine on the
// cart and on the review step (frames `wizard-3-cart` / `wizard-4-review`):
// gross, discount, taxable, the per-rate tax behind an expander, then Net.
test("the cart's totals card reads gross -> taxable -> net, with tax behind the expander", async () => {
  server.use(...baseHandlers());
  seedDraft();
  const { findByText, getByText, getAllByText, queryByText, findByLabelText } = await renderWizard();

  fireEvent.press(await findByText('CONTINUE'));
  fireEvent.press(await findByLabelText('View order draft'));
  expect(await findByText('STEP 3 OF 4')).toBeTruthy();

  // 20 x ₹499.00 = ₹9,980.00 gross (undiscounted, so also the taxable),
  // 12% tax = ₹1,197.60, net ₹11,177.60.
  expect(getByText('Gross')).toBeTruthy();
  expect(getByText('Taxable')).toBeTruthy();
  expect(getAllByText('₹9,980.00').length).toBeGreaterThanOrEqual(2);
  expect(getByText('₹11,177.60')).toBeTruthy();

  // The per-rate split is one tap away rather than always on screen.
  expect(queryByText('Tax @ 12%')).toBeNull();
  fireEvent.press(getByText('View tax breakdown'));
  expect(await findByText('Tax @ 12%')).toBeTruthy();
  expect(getByText('₹1,197.60')).toBeTruthy();
});
