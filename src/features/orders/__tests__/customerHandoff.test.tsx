import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react-native';
import { CommonActions, NavigationContainer, createNavigationContainerRef, type NavigationState, type PartialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { CustomerCreateScreen } from '@/features/customers/screens/CustomerCreateScreen';
import { useOrderDraft } from '@/features/orders/store/draft';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import type { RootStackParamList } from '@/navigation/types';

// D4 §3 — "create a customer, then carry on with the order".
//
// The hand-off is a `navigate('NewOrder', { pickedCustomerId })`, and route
// params are *sticky*: navigating back to a route that already carries the
// same params changes nothing observable, so the wizard's "forward to the
// products step" — keyed on those params — fired the first time and never
// again. A rep who created the same customer twice (or came back through the
// picker after changing their mind) was left staring at step 1 with the
// customer already chosen. A `pickNonce` makes every hand-off distinct, and
// `NewOrderScreen` clears both params once it has seeded from them.

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

const detail = (id: string, name: string) => ({
  id, code: 'CUST-0002', name, customer_type_id: 'ct1', customer_group: null,
  gstin: null, gst_reg_type: null, pan: null, state: 'Tamil Nadu', country: 'India',
  payment_terms_id: null, credit_limit: null, default_payment_mode_id: null, notes: null,
  custom: null, is_active: true, contacts: [],
  addresses: [{
    id: 'a1', type: 'both', line1: '12 Anna Salai', line2: null, city: 'Chennai',
    state: 'Tamil Nadu', pincode: '600002', country: 'India',
    is_default_billing: true, is_default_shipping: true,
  }],
});

const handlers = () => [
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(ME)),
  http.get('http://localhost:8000/api/v1/customers', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/customers/c-new', () => HttpResponse.json(detail('c-new', 'Urban Threads Retail'))),
  http.get('http://localhost:8000/api/v1/customers/c-new/financial-summary', () =>
    HttpResponse.json({ outstanding: '0.00', advance_balance: '0.00', total_paid: '0.00', order_value: '0.00', credit_limit: null, overdue_amount: '0.00' })),
  http.get('http://localhost:8000/api/v1/customer-types', () =>
    HttpResponse.json({ items: [{ id: 'ct1', name: 'Retail', is_active: true }], total: 1 })),
  http.get('http://localhost:8000/api/v1/payment-terms', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/categories', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/products', () => HttpResponse.json({ items: [], total: 0 })),
  http.get('http://localhost:8000/api/v1/variants', () => HttpResponse.json({ items: [], total: 0 })),
  http.post('http://localhost:8000/api/v1/customers/duplicate-check', () => HttpResponse.json({ matches: [] })),
  http.post('http://localhost:8000/api/v1/customers', () =>
    HttpResponse.json(detail('c-new', 'Urban Threads Retail'), { status: 201 })),
];

const Root = createNativeStackNavigator<RootStackParamList>();

type Nav = ReturnType<typeof createNavigationContainerRef<RootStackParamList>>;

async function renderApp() {
  const navRef = createNavigationContainerRef<RootStackParamList>();
  // Every navigation state the container ever held, so the test can assert on
  // the params the hand-off carried *before* the screen clears them again.
  const states: (NavigationState | PartialState<NavigationState> | undefined)[] = [];
  const utils = await render(
    <Providers>
      <NavigationContainer ref={navRef} onStateChange={(s) => states.push(s)}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="Tabs">{() => <Text>Home tab</Text>}</Root.Screen>
          <Root.Screen name="NewOrder" component={NewOrderScreen} />
          <Root.Screen name="CustomerCreate" component={CustomerCreateScreen} initialParams={{ returnTo: 'order' }} />
        </Root.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  expect(await utils.findByText('Home tab')).toBeTruthy();
  return { ...utils, navRef, states };
}

function newOrderParamsSeen(states: (NavigationState | PartialState<NavigationState> | undefined)[]) {
  const seen: Record<string, unknown>[] = [];
  for (const state of states) {
    for (const route of state?.routes ?? []) {
      if (route.name === 'NewOrder' && route.params) seen.push(route.params as Record<string, unknown>);
    }
  }
  return seen;
}

function currentNewOrderParams(navRef: Nav) {
  return navRef.getRootState()?.routes.find((r) => r.name === 'NewOrder')?.params;
}

async function fillRequiredFields(utils: RenderResult) {
  await fireEvent.changeText(utils.getByLabelText('Name'), 'Urban Threads Retail');
  await fireEvent.press(utils.getByLabelText('Customer type'));
  await fireEvent.press(await utils.findByText('Retail'));
  await fireEvent.changeText(utils.getByLabelText('Phone'), '98401 22110');
  await fireEvent.changeText(utils.getByLabelText('Address line 1'), '12 Anna Salai');
  await fireEvent.changeText(utils.getByLabelText('City'), 'Chennai');
  await fireEvent.press(utils.getByLabelText('State'));
  await fireEvent.press(await utils.findByText('Tamil Nadu'));
  await fireEvent.changeText(utils.getByLabelText('PIN code'), '600002');
}

test('creating a customer from the wizard hands back a nonce and forwards to the products step', async () => {
  server.use(...handlers());
  const utils = await renderApp();
  const { navRef, states } = utils;

  await act(async () => {
    navRef.navigate('NewOrder', {});
  });
  expect(await utils.findByText('STEP 1 OF 4')).toBeTruthy();

  await fireEvent.press(await utils.findByText('Create new customer'));
  await fillRequiredFields(utils);
  await fireEvent.press(utils.getByText('SAVE & SELECT'));

  // The hand-off itself: the new customer's id plus a fresh, numeric nonce.
  await waitFor(() => expect(newOrderParamsSeen(states).some((p) => p.pickedCustomerId === 'c-new')).toBe(true));
  const handoff = newOrderParamsSeen(states).find((p) => p.pickedCustomerId === 'c-new')!;
  expect(typeof handoff.pickNonce).toBe('number');
  expect(handoff.pickNonce as number).toBeGreaterThan(0);

  // ...and the wizard skips the question it just answered.
  expect(await utils.findByText('STEP 2 OF 4')).toBeTruthy();
  await waitFor(() => expect(useOrderDraft.getState().customer?.id).toBe('c-new'));

  // Seeded, so the params have done their job and are cleared — leaving them
  // on the route is what made the next hand-off a no-op.
  await waitFor(() => {
    const params = currentNewOrderParams(navRef) as Record<string, unknown> | undefined;
    expect(params?.pickedCustomerId).toBeUndefined();
    expect(params?.pickNonce).toBeUndefined();
  });
});

test('handing back the same customer again with a new nonce forwards again', async () => {
  server.use(...handlers());
  const utils = await renderApp();
  const { navRef } = utils;

  await act(async () => {
    navRef.navigate('NewOrder', { pickedCustomerId: 'c-new', pickNonce: 1 });
  });
  expect(await utils.findByText('STEP 2 OF 4')).toBeTruthy();

  // Back to step 1 — the rep changed their mind about who the order is for.
  await act(async () => {
    navRef.dispatch(CommonActions.goBack());
  });
  expect(await utils.findByText('STEP 1 OF 4')).toBeTruthy();

  // The same customer, a second time. Identical `pickedCustomerId`: only the
  // nonce distinguishes this hand-off from the last one.
  await act(async () => {
    navRef.navigate('NewOrder', { pickedCustomerId: 'c-new', pickNonce: 2 });
  });

  expect(await utils.findByText('STEP 2 OF 4')).toBeTruthy();
});
