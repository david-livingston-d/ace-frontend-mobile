import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { CommonActions, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { SuccessScreen } from '@/features/orders/screens/wizard/SuccessScreen';
import { useOrderDraft } from '@/features/orders/store/draft';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import type { LineSnapshot } from '@/features/products/types';
import type { RootStackParamList } from '@/navigation/types';

// D4 §1 — where the app stands *after* an order is placed.
//
// The success card used to be a fifth screen inside the order wizard's own
// nested stack, which made every exit from it wrong in a different way: the
// Android hardware back button popped it straight back onto the review step of
// an order that no longer had a draft behind it, and "View order" left that
// same emptied wizard underneath the order's detail page. This file pins the
// replacement down as *root navigation state*, not as rendered text: after a
// confirm, the root stack is `[Tabs, OrderSuccess]` — the wizard is gone —
// and every exit resets from there.

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

const CUSTOMER_DETAIL = {
  id: 'c1', code: 'CUS-0001', name: 'Arjun Mehta', customer_type_id: 'ct1', customer_group: null,
  gstin: null, gst_reg_type: null, pan: null, state: 'TN', country: 'IN', payment_terms_id: 'pt1',
  credit_limit: null, default_payment_mode_id: null, notes: null, custom: null, is_active: true,
  contacts: [],
  addresses: [{
    id: 'a1', type: 'both', line1: '1 MG Road', line2: null, city: 'Chennai', state: 'TN',
    pincode: '600001', country: 'IN', is_default_billing: true, is_default_shipping: true,
  }],
};

const CREATED = {
  id: 'o9', number: 'POS-26-27-000043', customer_id: 'c1',
};

const handlers = () => [
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(ME)),
  http.get('http://localhost:8000/api/v1/customers/c1', () => HttpResponse.json(CUSTOMER_DETAIL)),
  http.get('http://localhost:8000/api/v1/customers/c1/financial-summary', () =>
    HttpResponse.json({ outstanding: '0.00', advance_balance: '0.00', total_paid: '0.00', order_value: '0.00', credit_limit: null, overdue_amount: '0.00' })),
  http.get('http://localhost:8000/api/v1/payment-terms', () => HttpResponse.json({ items: [{ id: 'pt1', name: 'Net 30', days: 30, is_active: true }], total: 1 })),
  http.get('http://localhost:8000/api/v1/categories', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/products', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/variants', () => HttpResponse.json({ items: [], total: 0 })),
  http.post('http://localhost:8000/api/v1/sales-orders', () => HttpResponse.json(CREATED, { status: 201 })),
];

const snap = (sku: string): LineSnapshot => ({
  sku, productId: 'p1', productName: 'Classic Tee', variantLabel: 'Black / M',
  attributeValues: [], taxRate: '12', price: { sellingPrice: '499.00', taxInclusive: false }, stock: null,
});

function seedDraft() {
  const s = useOrderDraft.getState();
  s.setCustomer({ id: 'c1', name: 'Arjun Mehta', code: 'CUS-0001', addresses: CUSTOMER_DETAIL.addresses, paymentTermsId: 'pt1' });
  s.addLines([{ variantId: 'v1', qty: 12, snapshot: snap('WH-TEE-BLK-M') }]);
}

const Root = createNativeStackNavigator<RootStackParamList>();
const Tabs = createNativeStackNavigator();

// A stand-in for the real tab navigator: enough of one that
// `navigate('Tabs', { screen: 'Orders' })` has somewhere to land and the test
// can read back *which* tab the reset focused.
function TabsStub() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home">{() => <Text>Home tab</Text>}</Tabs.Screen>
      <Tabs.Screen name="Orders">{() => <Text>Orders tab</Text>}</Tabs.Screen>
    </Tabs.Navigator>
  );
}

async function renderApp() {
  const navRef = createNavigationContainerRef<RootStackParamList>();
  const utils = await render(
    <Providers>
      <NavigationContainer ref={navRef}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="Tabs" component={TabsStub} />
          <Root.Screen name="NewOrder" component={NewOrderScreen} />
          <Root.Screen name="OrderSuccess" component={SuccessScreen} />
          <Root.Screen name="OrderDetail">{() => <Text>Order detail stub</Text>}</Root.Screen>
          <Root.Screen name="RecordPayment">{() => <Text>Record payment stub</Text>}</Root.Screen>
        </Root.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  return { ...utils, navRef };
}

function rootRouteNames(navRef: ReturnType<typeof createNavigationContainerRef<RootStackParamList>>): string[] {
  return (navRef.getRootState()?.routes ?? []).map((r) => r.name);
}

/** The `Tabs` route's key — a reset rebuilds the route and so re-keys it. */
function tabsKey(navRef: ReturnType<typeof createNavigationContainerRef<RootStackParamList>>): string | undefined {
  return navRef.getRootState()?.routes[0]?.key;
}

/** Which tab the `Tabs` route is focused on, read off the real nested state. */
function focusedTab(navRef: ReturnType<typeof createNavigationContainerRef<RootStackParamList>>): string | undefined {
  const tabs = navRef.getRootState()?.routes.find((r) => r.name === 'Tabs');
  const state = tabs?.state;
  if (!state?.routes) return undefined;
  return state.routes[state.index ?? 0]?.name;
}

/** Tabs -> "+" -> the wizard, all four steps, ending on a confirmed order. */
async function placeOrder() {
  seedDraft();
  const utils = await renderApp();
  expect(await utils.findByText('Home tab')).toBeTruthy();

  await act(async () => {
    utils.navRef.navigate('NewOrder', { fresh: true });
  });

  fireEvent.press(await utils.findByText('CONTINUE'));
  fireEvent.press(await utils.findByLabelText('View order draft'));
  fireEvent.press(await utils.findByText('REVIEW ORDER'));
  expect(await utils.findByText('STEP 4 OF 4')).toBeTruthy();
  fireEvent.press(utils.getByText('CONFIRM ORDER'));
  expect(await utils.findByText('Order POS-26-27-000043 created')).toBeTruthy();
  return utils;
}

test('confirming an order replaces the whole wizard with a root-level success screen', async () => {
  server.use(...handlers());
  const { navRef } = await placeOrder();

  // Not `[Tabs, NewOrder]` with the success card nested inside it: the wizard
  // route itself is gone, so there is nothing half-filled left to go back to.
  await waitFor(() => expect(rootRouteNames(navRef)).toEqual(['Tabs', 'OrderSuccess']));
  expect(focusedTab(navRef)).toBe('Orders');
});

test('hardware back from the success screen lands on the Orders tab, not the emptied wizard', async () => {
  server.use(...handlers());
  const { navRef, queryByText, findByText } = await placeOrder();

  // The route *names* alone cannot tell the guard from the default behaviour:
  // a plain POP of `OrderSuccess` also leaves `['Tabs']` with Orders focused
  // (the tab was already focused when the wizard was reset away). What only
  // the guard does is dispatch a RESET, and a reset builds its routes fresh —
  // so the `Tabs` route comes back with a *new* key. That key is the proof.
  const tabsKeyBefore = tabsKey(navRef);
  expect(tabsKeyBefore).toBeDefined();

  // Exactly what the Android back button and the back swipe both dispatch.
  await act(async () => {
    navRef.dispatch(CommonActions.goBack());
  });

  expect(await findByText('Orders tab')).toBeTruthy();
  await waitFor(() => expect(rootRouteNames(navRef)).toEqual(['Tabs']));
  await waitFor(() => expect(tabsKey(navRef)).not.toBe(tabsKeyBefore));
  expect(focusedTab(navRef)).toBe('Orders');
  expect(queryByText('STEP 4 OF 4')).toBeNull();
  expect(queryByText('Order POS-26-27-000043 created')).toBeNull();
});

test('View order leaves the Orders tab underneath the order, not the wizard', async () => {
  server.use(...handlers());
  const { navRef, getByText, findByText } = await placeOrder();

  fireEvent.press(getByText('VIEW ORDER'));

  expect(await findByText('Order detail stub')).toBeTruthy();
  await waitFor(() => expect(rootRouteNames(navRef)).toEqual(['Tabs', 'OrderDetail']));
  expect(navRef.getCurrentRoute()?.params).toEqual({ id: 'o9' });
});

test('Record payment now stacks the payment form over the order, over the tabs', async () => {
  server.use(...handlers());
  const { navRef, getByText, findByText } = await placeOrder();

  fireEvent.press(getByText('RECORD PAYMENT NOW'));

  expect(await findByText('Record payment stub')).toBeTruthy();
  await waitFor(() => expect(rootRouteNames(navRef)).toEqual(['Tabs', 'OrderDetail', 'RecordPayment']));
  expect(navRef.getCurrentRoute()?.params).toEqual({ orderId: 'o9', customerId: 'c1' });
});

test('New order re-enters the wizard on a cleared draft, with no resume prompt behind it', async () => {
  server.use(...handlers());
  const { navRef, getByText, findByText } = await placeOrder();

  fireEvent.press(getByText('NEW ORDER'));

  expect(await findByText('STEP 1 OF 4')).toBeTruthy();
  await waitFor(() => expect(rootRouteNames(navRef)).toEqual(['Tabs', 'NewOrder']));
  expect(navRef.getCurrentRoute()?.name).toBe('CustomerStep');
  expect(useOrderDraft.getState().customer).toBeNull();
  expect(useOrderDraft.getState().lines).toEqual({});
});
