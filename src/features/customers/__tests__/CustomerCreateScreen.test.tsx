import React from 'react';
import { fireEvent, render, waitFor, type RenderResult } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CustomerCreateScreen } from '@/features/customers/screens/CustomerCreateScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { returnTo: 'order' | 'detail' } = { returnTo: 'detail' };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockRouteParams = { returnTo: 'detail' };
});
afterAll(() => server.close());

const me = (permissions: Record<string, string> = {}) =>
  http.get('http://localhost:8000/api/v1/auth/me', () =>
    HttpResponse.json({
      id: 'u1', email: 'k@ace.in', name: 'Karthik S', is_superadmin: false,
      permissions, department_id: null, team_id: null, roles: [],
    }));

const customerTypes = () =>
  http.get('http://localhost:8000/api/v1/customer-types', () =>
    HttpResponse.json({ items: [{ id: 'ct1', name: 'Retail', is_active: true }], total: 1 }));

// `@testing-library/react-native`'s `fireEvent` is async (see `LoginScreen.test.tsx`'s
// own note on this) — every call here is awaited, same convention.
async function fillRequiredFields(utils: RenderResult) {
  const { getByLabelText, findByText } = utils;
  await fireEvent.changeText(getByLabelText('Name'), 'Urban Threads Retail');
  await fireEvent.press(getByLabelText('Customer type'));
  await fireEvent.press(await findByText('Retail'));
  await fireEvent.changeText(getByLabelText('Phone'), '98401 22110');
  await fireEvent.changeText(getByLabelText('Address line 1'), '12 Anna Salai');
  await fireEvent.changeText(getByLabelText('City'), 'Chennai');
  // `state` became a `Select` over `INDIAN_STATES` (Task 1 hygiene carry-in)
  // — same interaction as "Customer type" above, not a text field any more.
  await fireEvent.press(getByLabelText('State'));
  await fireEvent.press(await findByText('Tamil Nadu'));
  await fireEvent.changeText(getByLabelText('PIN code'), '600002');
}

test('a duplicate-check match shows the warning sheet and holds off POST /customers until "Create anyway"', async () => {
  let dupCalls = 0;
  let createCalls = 0;
  let createBody: unknown = null;

  server.use(
    me(),
    customerTypes(),
    http.post('http://localhost:8000/api/v1/customers/duplicate-check', async ({ request }) => {
      dupCalls += 1;
      await request.json();
      return HttpResponse.json({
        matches: [{ id: 'c-existing', code: 'CUST-0001', name: 'Urban Threads Retail', matched_on: ['mobile'] }],
      });
    }),
    http.post('http://localhost:8000/api/v1/customers', async ({ request }) => {
      createCalls += 1;
      createBody = await request.json();
      return HttpResponse.json(
        { id: 'c-new', code: 'CUST-0002', name: 'Urban Threads Retail', customer_type_id: 'ct1', customer_group: null, gstin: null, gst_reg_type: null, pan: null, state: 'Tamil Nadu', country: 'India', payment_terms_id: null, credit_limit: null, default_payment_mode_id: null, notes: null, custom: null, is_active: true },
        { status: 201 },
      );
    }),
  );

  const utils = await render(
    <Providers>
      <CustomerCreateScreen />
    </Providers>,
  );

  await fillRequiredFields(utils);
  await fireEvent.press(utils.getByText('SAVE & SELECT'));

  expect(await utils.findByText('Urban Threads Retail · matched on mobile')).toBeTruthy();
  expect(await utils.findByText('USE EXISTING')).toBeTruthy();
  expect(await utils.findByText('CREATE ANYWAY')).toBeTruthy();
  expect(dupCalls).toBe(1);
  expect(createCalls).toBe(0); // no POST /customers yet

  await fireEvent.press(utils.getByText('CREATE ANYWAY'));

  await waitFor(() => expect(createCalls).toBe(1));
  const body = createBody as { contacts: { mobile: string }[]; addresses: { type: string }[]; country: string };
  expect(body.contacts[0]?.mobile).toBe('9840122110');
  expect(body.addresses[0]?.type).toBe('both');
  expect(body.country).toBe('India');
  expect(mockNavigate).toHaveBeenCalledWith('CustomerDetail', { id: 'c-new' });
});

test('zero duplicate matches: POST /customers happens straight away', async () => {
  let createCalls = 0;

  server.use(
    me(),
    customerTypes(),
    http.post('http://localhost:8000/api/v1/customers/duplicate-check', () => HttpResponse.json({ matches: [] })),
    http.post('http://localhost:8000/api/v1/customers', async ({ request }) => {
      createCalls += 1;
      await request.json();
      return HttpResponse.json(
        { id: 'c-new', code: 'CUST-0002', name: 'Urban Threads Retail', customer_type_id: 'ct1', customer_group: null, gstin: null, gst_reg_type: null, pan: null, state: 'Tamil Nadu', country: 'India', payment_terms_id: null, credit_limit: null, default_payment_mode_id: null, notes: null, custom: null, is_active: true },
        { status: 201 },
      );
    }),
  );

  const utils = await render(
    <Providers>
      <CustomerCreateScreen />
    </Providers>,
  );

  await fillRequiredFields(utils);
  await fireEvent.press(utils.getByText('SAVE & SELECT'));

  await waitFor(() => expect(createCalls).toBe(1));
  expect(mockNavigate).toHaveBeenCalledWith('CustomerDetail', { id: 'c-new' });
});
