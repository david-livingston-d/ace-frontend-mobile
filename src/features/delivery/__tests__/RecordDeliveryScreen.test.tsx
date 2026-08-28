import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { RecordDeliveryScreen } from '@/features/delivery/screens/RecordDeliveryScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';
import { deliverable, deliveryNoteDetail, me, orderDetail } from '@/test/fixtures';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { orderId: 'o1' } }),
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

const meRoute = (permissions: Record<string, string>) =>
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(me(permissions)));

const TWO_LINES = deliverable({
  lines: [
    {
      so_line_id: 'l1',
      variant_id: 'v1',
      sku: 'SKU-1',
      product_name: 'Shirt',
      variant_label: 'M / Blue',
      uom: 'PCS',
      ordered: '40',
      reserved: '8',
      delivered: '0',
      eligible: '8',
      reservations: [],
    },
    {
      so_line_id: 'l2',
      variant_id: 'v2',
      sku: 'SKU-2',
      product_name: 'Trousers',
      variant_label: 'L / Black',
      uom: 'PCS',
      ordered: '10',
      reserved: '0',
      delivered: '0',
      eligible: '0',
      reservations: [],
    },
  ],
});

test('steppers prefill at eligible, the zero-eligible line is disabled, and CONFIRM posts the non-zero lines only', async () => {
  let createBody: unknown;
  server.use(
    meRoute({ 'delivery_note.create': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/deliverable', () => HttpResponse.json(TWO_LINES)),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/delivery-notes', async ({ request }) => {
      createBody = await request.json();
      return HttpResponse.json(deliveryNoteDetail({ status: 'draft' }), { status: 201 });
    }),
  );

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <RecordDeliveryScreen />
    </Providers>,
  );

  expect(await findByText('SKU-1')).toBeTruthy();
  // "Deliver all" is the default state — line 1 prefills at its eligible (8).
  expect(getByLabelText('SKU-1 quantity').props.value).toBe('8');
  // Nothing eligible on line 2 — no stepper at all, just why.
  expect(getByText('Nothing eligible to deliver on this line')).toBeTruthy();

  await fireEvent.press(getByText('CONFIRM DELIVERY'));
  await fireEvent.press(await findByText('CONFIRM'));

  await waitFor(() => expect(createBody).toBeTruthy());
  expect(createBody).toEqual({
    dn_date: expect.any(String),
    lines: [{ so_line_id: 'l1', qty: '8' }],
    remarks: null,
  });
  expect(mockNavigate).toHaveBeenCalledWith('DeliveryNoteDetail', { id: 'dn1' });
});

test('a user with delivery_note.create only stops after create — no submit/mark-delivered calls', async () => {
  let submitCalls = 0;
  server.use(
    meRoute({ 'delivery_note.create': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/deliverable', () => HttpResponse.json(TWO_LINES)),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/delivery-notes', () =>
      HttpResponse.json(deliveryNoteDetail({ status: 'draft' }), { status: 201 })),
    http.post('http://localhost:8000/api/v1/delivery-notes/dn1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json(deliveryNoteDetail({ status: 'submitted' }));
    }),
  );

  const { findByText, getByText } = await render(
    <Providers>
      <RecordDeliveryScreen />
    </Providers>,
  );

  expect(await findByText('SKU-1')).toBeTruthy();
  await fireEvent.press(getByText('CONFIRM DELIVERY'));
  await fireEvent.press(await findByText('CONFIRM'));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('DeliveryNoteDetail', { id: 'dn1' }));
  expect(submitCalls).toBe(0);
});

test('a user with all three permissions auto-chains create -> submit -> mark delivered', async () => {
  let submitCalls = 0;
  let markDeliveredCalls = 0;
  server.use(
    meRoute({
      'delivery_note.create': 'own',
      'delivery_note.submit': 'own',
      'delivery_note.mark_delivered': 'own',
    }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/deliverable', () => HttpResponse.json(TWO_LINES)),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/delivery-notes', () =>
      HttpResponse.json(deliveryNoteDetail({ status: 'draft' }), { status: 201 })),
    http.post('http://localhost:8000/api/v1/delivery-notes/dn1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json(deliveryNoteDetail({ status: 'submitted' }));
    }),
    http.post('http://localhost:8000/api/v1/delivery-notes/dn1/mark-delivered', () => {
      markDeliveredCalls += 1;
      return HttpResponse.json(deliveryNoteDetail({ status: 'delivered' }));
    }),
  );

  const { findByText, getByText } = await render(
    <Providers>
      <RecordDeliveryScreen />
    </Providers>,
  );

  expect(await findByText('SKU-1')).toBeTruthy();
  await fireEvent.press(getByText('CONFIRM DELIVERY'));
  await fireEvent.press(await findByText('CONFIRM'));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('DeliveryNoteDetail', { id: 'dn1' }));
  expect(submitCalls).toBe(1);
  expect(markDeliveredCalls).toBe(1);
});

test('exceeds_eligible highlights the named line and refetches the deliverable', async () => {
  let getCalls = 0;
  server.use(
    meRoute({ 'delivery_note.create': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/deliverable', () => {
      getCalls += 1;
      return HttpResponse.json(TWO_LINES);
    }),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/delivery-notes', () =>
      HttpResponse.json(
        { detail: { code: 'exceeds_eligible', message: 'That exceeds what is eligible', so_line_id: 'l1' } },
        { status: 422 },
      )),
  );

  const { findByText, getByText } = await render(
    <Providers>
      <RecordDeliveryScreen />
    </Providers>,
  );

  expect(await findByText('SKU-1')).toBeTruthy();
  await fireEvent.press(getByText('CONFIRM DELIVERY'));
  await fireEvent.press(await findByText('CONFIRM'));

  expect(await findByText('That quantity is more than what is reserved and undelivered on this line — reduce it.')).toBeTruthy();
  await waitFor(() => expect(getCalls).toBe(2)); // the initial load + the recovery refetch
});

test('delivery mutations invalidate the order detail cache', async () => {
  server.use(
    meRoute({ 'delivery_note.create': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/deliverable', () => HttpResponse.json(TWO_LINES)),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/delivery-notes', () =>
      HttpResponse.json(deliveryNoteDetail({ status: 'draft' }), { status: 201 })),
  );

  // Seed the order detail cache so we can verify it gets invalidated.
  const soId = 'o1';
  queryClient.setQueryData(keys.order(soId), orderDetail({ id: soId }));

  const { findByText, getByText } = await render(
    <Providers>
      <RecordDeliveryScreen />
    </Providers>,
  );

  expect(await findByText('SKU-1')).toBeTruthy();
  await fireEvent.press(getByText('CONFIRM DELIVERY'));
  await fireEvent.press(await findByText('CONFIRM'));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('DeliveryNoteDetail', { id: 'dn1' }));
  expect(queryClient.getQueryState(keys.order(soId))?.isInvalidated).toBe(true);
});

// M4-T8 (D3): "Deliver all" is the screen's default *and* an explicit action —
// CLEAR zeroes every line for a hand-picked partial delivery, DELIVER ALL puts
// each stepper back at its eligible quantity.
test('DELIVER ALL re-prefills every line after CLEAR has zeroed them', async () => {
  server.use(
    meRoute({ 'delivery_note.create': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/deliverable', () => HttpResponse.json(TWO_LINES)),
  );

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <RecordDeliveryScreen />
    </Providers>,
  );

  expect(await findByText('SKU-1')).toBeTruthy();
  expect(getByLabelText('SKU-1 quantity').props.value).toBe('8');

  await fireEvent.press(getByText('CLEAR'));
  expect(getByLabelText('SKU-1 quantity').props.value).toBe('0');

  await fireEvent.press(getByText('DELIVER ALL'));
  expect(getByLabelText('SKU-1 quantity').props.value).toBe('8');
});

test('the screen names its two steps and how much is still to deliver', async () => {
  server.use(
    meRoute({ 'delivery_note.create': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/deliverable', () => HttpResponse.json(TWO_LINES)),
  );

  const { findByText, getByText } = await render(
    <Providers>
      <RecordDeliveryScreen />
    </Providers>,
  );

  expect(await findByText('Create')).toBeTruthy();
  expect(getByText('Confirm')).toBeTruthy();
  // 8 eligible on line 1, nothing on line 2.
  expect(getByText('8 units still to deliver')).toBeTruthy();
  expect(getByText('Remaining 8 · reserved 8')).toBeTruthy();
});
