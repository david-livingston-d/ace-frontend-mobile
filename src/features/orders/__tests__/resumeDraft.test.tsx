import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { useOrderDraft, hasContent } from '@/features/orders/store/draft';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import type { LineSnapshot } from '@/features/products/types';
import type { RootStackParamList } from '@/navigation/types';

// D4 §2 — the draft is persisted to MMKV, so an order abandoned halfway comes
// back the next time the wizard opens. Silently reusing it is how a rep ends
// up adding today's shirts to last week's half-finished order for a different
// customer; silently dropping it throws away real picking work. So: ask, once,
// on entry — and never ask when the caller already knows the draft is fresh
// (the success screen's "New order", which resets before it navigates).

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

const ADDRESSES = [{
  id: 'a1', type: 'both', line1: '1 MG Road', line2: null, city: 'Chennai', state: 'TN',
  pincode: '600001', country: 'IN', is_default_billing: true, is_default_shipping: true,
}];

const CUSTOMER = {
  id: 'c1', code: 'CUS-0001', name: 'Arjun Mehta', customer_type_id: 'ct1', customer_group: null,
  gstin: null, gst_reg_type: null, pan: null, state: 'TN', country: 'IN', payment_terms_id: 'pt1',
  credit_limit: null, default_payment_mode_id: null, notes: null, custom: null, is_active: true,
};

const handlers = () => [
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(ME)),
  http.get('http://localhost:8000/api/v1/customers', () => HttpResponse.json({ items: [CUSTOMER], total: 1 })),
  http.get('http://localhost:8000/api/v1/customers/c1', () =>
    HttpResponse.json({ ...CUSTOMER, contacts: [], addresses: ADDRESSES })),
  http.get('http://localhost:8000/api/v1/customers/c1/financial-summary', () =>
    HttpResponse.json({ outstanding: '0.00', advance_balance: '0.00', total_paid: '0.00', order_value: '0.00', credit_limit: null, overdue_amount: '0.00' })),
  http.get('http://localhost:8000/api/v1/customer-types', () => HttpResponse.json({ items: [{ id: 'ct1', name: 'Retail', is_active: true }], total: 1 })),
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
  s.setCustomer({ id: 'c1', name: 'Arjun Mehta', code: 'CUS-0001', addresses: ADDRESSES, paymentTermsId: 'pt1' });
  s.addLines([{ variantId: 'v1', qty: 12, snapshot: snap('WH-TEE-BLK-M') }]);
}

const Root = createNativeStackNavigator<RootStackParamList>();

async function renderApp() {
  const navRef = createNavigationContainerRef<RootStackParamList>();
  const utils = await render(
    <Providers>
      <NavigationContainer ref={navRef}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="Tabs">{() => <Text>Home tab</Text>}</Root.Screen>
          <Root.Screen name="NewOrder" component={NewOrderScreen} />
          <Root.Screen name="CustomerCreate">{() => <Text>Customer create stub</Text>}</Root.Screen>
        </Root.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  expect(await utils.findByText('Home tab')).toBeTruthy();
  return { ...utils, navRef };
}

// Exactly what the tab bar's "+" dispatches (`TabNavigator.tsx`): `{}`, never
// `undefined` — a bare `navigate` keeps the previous params.
async function pressPlus(navRef: ReturnType<typeof createNavigationContainerRef<RootStackParamList>>) {
  await act(async () => {
    navRef.navigate('NewOrder', {});
  });
}

test('hasContent is false for an empty draft and true once there is a customer or a line', () => {
  expect(hasContent(useOrderDraft.getState())).toBe(false);
  useOrderDraft.getState().setCustomer({ id: 'c1', name: 'Arjun Mehta', code: 'CUS-0001', addresses: ADDRESSES, paymentTermsId: 'pt1' });
  expect(hasContent(useOrderDraft.getState())).toBe(true);
  useOrderDraft.getState().reset();
  useOrderDraft.getState().addLines([{ variantId: 'v1', qty: 1, snapshot: snap('WH-TEE-BLK-M') }]);
  expect(hasContent(useOrderDraft.getState())).toBe(true);
});

test('a left-over draft asks before the wizard reuses it', async () => {
  server.use(...handlers());
  seedDraft();
  const { navRef, findByText } = await renderApp();

  await pressPlus(navRef);

  expect(await findByText('Resume draft?')).toBeTruthy();
});

test('Resume keeps the draft and the prompt does not come back', async () => {
  server.use(...handlers());
  seedDraft();
  const { navRef, findByText, getByText, queryByText } = await renderApp();
  await pressPlus(navRef);
  expect(await findByText('Resume draft?')).toBeTruthy();

  await fireEvent.press(getByText('RESUME'));

  await waitFor(() => expect(queryByText('Resume draft?')).toBeNull());
  expect(useOrderDraft.getState().customer?.id).toBe('c1');
  expect(Object.keys(useOrderDraft.getState().lines)).toEqual(['v1']);
  // Step 1 with the customer already answered — the draft really was kept.
  expect(await findByText('Arjun Mehta')).toBeTruthy();
});

test('Start over empties the draft and drops the rep back on the customer search', async () => {
  server.use(...handlers());
  seedDraft();
  const { navRef, findByText, getByText, queryByText, findByPlaceholderText } = await renderApp();
  await pressPlus(navRef);
  expect(await findByText('Resume draft?')).toBeTruthy();

  await fireEvent.press(getByText('START OVER'));

  await waitFor(() => expect(queryByText('Resume draft?')).toBeNull());
  expect(useOrderDraft.getState().customer).toBeNull();
  expect(useOrderDraft.getState().lines).toEqual({});
  // The inline picker, not the "Customer / Change customer" card.
  expect(await findByPlaceholderText('Search customer name or phone')).toBeTruthy();
  expect(queryByText('CHANGE CUSTOMER')).toBeNull();
});

test('an entry that declares itself fresh never prompts, even with a draft in the store', async () => {
  server.use(...handlers());
  seedDraft();
  const { navRef, findByText, queryByText } = await renderApp();

  await act(async () => {
    navRef.navigate('NewOrder', { fresh: true });
  });

  expect(await findByText('STEP 1 OF 4')).toBeTruthy();
  expect(queryByText('Resume draft?')).toBeNull();
});

test('an empty draft opens straight into step 1 with no prompt', async () => {
  server.use(...handlers());
  const { navRef, findByText, queryByText } = await renderApp();

  await pressPlus(navRef);

  expect(await findByText('STEP 1 OF 4')).toBeTruthy();
  expect(queryByText('Resume draft?')).toBeNull();
});

// The prompt is a question about *entry*, so it has to be decided at entry and
// then left alone. Deriving it continuously from the draft is the trap: the
// very next thing a rep does on step 1 is pick a customer, which puts content
// in the draft — and a live `hasContent()` would then throw "Resume draft?"
// over the order they are in the middle of starting.
test('picking a customer on step 1 does not raise the prompt behind the rep', async () => {
  server.use(...handlers());
  const { navRef, findByText, queryByText } = await renderApp();

  await pressPlus(navRef);
  expect(await findByText('STEP 1 OF 4')).toBeTruthy();
  expect(queryByText('Resume draft?')).toBeNull();

  await fireEvent.press(await findByText('Arjun Mehta'));
  await waitFor(() => expect(useOrderDraft.getState().customer?.id).toBe('c1'));

  // The draft now has content, and the entry is still the same plain "+".
  expect(queryByText('Resume draft?')).toBeNull();
  // ...and it stays gone once the rep moves on.
  await fireEvent.press(await findByText('CONTINUE'));
  expect(await findByText('STEP 2 OF 4')).toBeTruthy();
  expect(queryByText('Resume draft?')).toBeNull();
});
