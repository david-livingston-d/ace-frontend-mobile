import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { RecordPaymentScreen } from '@/features/payments/screens/RecordPaymentScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { onlineManager } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { me, orderDetail, paymentDetail } from '@/test/fixtures';
import { todayIso } from '@/lib/format/date';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = { orderId: 'o1' };
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
  mockRouteParams = { orderId: 'o1' };
  // Restored outside `act`: RTL's cleanup has already unmounted everything, and
  // an un-awaited `act(...)` here would leave React's act scope open and break
  // the next test's updates.
  onlineManager.setOnline(true);
});
afterAll(() => server.close());

const API = 'http://localhost:8000/api/v1';

const meRoute = (permissions: Record<string, string>) =>
  http.get(`${API}/auth/me`, () => HttpResponse.json(me(permissions)));

const MODES = {
  items: [
    { id: 'pm1', name: 'Cash', is_active: true },
    { id: 'pm2', name: 'UPI', is_active: true },
    { id: 'pm3', name: 'Bank transfer', is_active: true },
    // Inactive modes are never offered — the server rejects them anyway.
    { id: 'pm9', name: 'Cheque (retired)', is_active: false },
  ],
  total: 4,
};

const modesRoute = (payload: typeof MODES = MODES) => http.get(`${API}/payment-modes`, () => HttpResponse.json(payload));

const ORDER = orderDetail({
  id: 'o1',
  customer_id: 'c1',
  customer_name: 'Arjun Mehta',
  summary: { ...orderDetail().summary, receivable: '11200.00' },
});

const orderRoute = () => http.get(`${API}/sales-orders/o1`, () => HttpResponse.json(ORDER));

const SUBMITTED = paymentDetail({
  id: 'pay1',
  status: 'submitted',
  number: 'PMT-26-27-000012',
  sales_order_id: 'o1',
  so_number: 'POS-26-27-000041',
  amount: '20000.00',
  allocated: '0.00',
  unallocated: '20000.00',
});

const SUGGESTION = {
  allocations: [
    {
      invoice_id: 'i1',
      invoice_number: 'INV-26-27-000003',
      so_id: 'o1',
      so_number: 'POS-26-27-000041',
      due_date: '2026-09-10',
      net: '11200.00',
      outstanding: '11200.00',
      amount: '11200.00',
    },
  ],
  unallocated_after: '8800.00',
};

async function typeAmountAndSave(screen: Awaited<ReturnType<typeof render>>, amount = '20000') {
  await fireEvent.changeText(await screen.findByLabelText('Amount'), amount);
  await fireEvent.press(screen.getByText('SAVE PAYMENT'));
}

test('opened from an order: defaults to "This order", posts the order-tagged payment, submits, and lands on the allocation step', async () => {
  let createBody: unknown;
  let submitCalls = 0;
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment.allocate': 'all', 'payment.read': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
    http.post(`${API}/payments`, async ({ request }) => {
      createBody = await request.json();
      return HttpResponse.json(paymentDetail({ id: 'pay1', status: 'draft', amount: '20000.00', sales_order_id: 'o1' }), { status: 201 });
    }),
    http.post(`${API}/payments/pay1/submit`, () => {
      submitCalls += 1;
      return HttpResponse.json(SUBMITTED);
    }),
    http.get(`${API}/payments/pay1/suggest-allocation`, () => HttpResponse.json(SUGGESTION)),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  // Header strip: the order and its customer.
  expect(await screen.findByText('POS-26-27-000041')).toBeTruthy();
  expect(screen.getByText('Arjun Mehta')).toBeTruthy();
  // Modes come from /payment-modes; the inactive one is not offered.
  expect(await screen.findByText('UPI')).toBeTruthy();
  expect(screen.queryByText('Cheque (retired)')).toBeNull();

  await fireEvent.press(screen.getByText('UPI'));
  await typeAmountAndSave(screen);

  await waitFor(() => expect(createBody).toBeTruthy());
  expect(createBody).toEqual({
    customer_id: 'c1',
    sales_order_id: 'o1',
    payment_date: todayIso(),
    amount: '20000',
    payment_mode_id: 'pm2',
    reference: null,
    remarks: null,
  });
  await waitFor(() => expect(submitCalls).toBe(1));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Allocation', { paymentId: 'pay1', invoiceId: undefined }));
});

test('"Customer advance" omits the order and skips allocation entirely', async () => {
  let createBody: unknown;
  let suggestCalls = 0;
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment.allocate': 'all', 'payment.read': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
    http.post(`${API}/payments`, async ({ request }) => {
      createBody = await request.json();
      return HttpResponse.json(paymentDetail({ id: 'pay1', status: 'draft' }), { status: 201 });
    }),
    http.post(`${API}/payments/pay1/submit`, () => HttpResponse.json(SUBMITTED)),
    http.get(`${API}/payments/pay1/suggest-allocation`, () => {
      suggestCalls += 1;
      return HttpResponse.json(SUGGESTION);
    }),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  await fireEvent.press(await screen.findByText('CUSTOMER ADVANCE'));
  await typeAmountAndSave(screen, '5000');

  await waitFor(() => expect(createBody).toBeTruthy());
  expect(createBody).toMatchObject({ customer_id: 'c1', sales_order_id: null, amount: '5000' });
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' }));
  expect(suggestCalls).toBe(0);
});

test('without payment.allocate the rep never sees an allocation screen — the payment detail shows it submitted', async () => {
  let suggestCalls = 0;
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment.read': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
    http.post(`${API}/payments`, () => HttpResponse.json(paymentDetail({ id: 'pay1', status: 'draft' }), { status: 201 })),
    http.post(`${API}/payments/pay1/submit`, () => HttpResponse.json(SUBMITTED)),
    http.get(`${API}/payments/pay1/suggest-allocation`, () => {
      suggestCalls += 1;
      return HttpResponse.json(SUGGESTION);
    }),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  expect(await screen.findByText('POS-26-27-000041')).toBeTruthy();
  await typeAmountAndSave(screen);

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' }));
  expect(suggestCalls).toBe(0);
  // The submitted payment is seeded from the submit response, so the detail
  // screen opens at "Submitted" without another round trip.
  expect(queryClient.getQueryData(keys.payment('pay1'))).toMatchObject({ status: 'submitted' });
});

test('an amount over the order receivable warns that the excess becomes an advance', async () => {
  server.use(
    meRoute({ 'payment.create': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  await fireEvent.changeText(await screen.findByLabelText('Amount'), '15000');
  expect(await screen.findByText('Excess ₹3,800.00 will become customer advance')).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Amount'), '11200');
  await waitFor(() => expect(screen.queryByText(/will become customer advance/)).toBeNull());
});

test('a 422 from the server is rendered with the payments error copy', async () => {
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
    http.post(`${API}/payments`, () =>
      HttpResponse.json({ detail: { code: 'payment_mode_invalid', message: 'Payment mode not found or inactive' } }, { status: 422 })),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  await typeAmountAndSave(screen);
  expect(await screen.findByText("That payment mode isn't active. Pick another one.")).toBeTruthy();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('a submit that fails leaves the payment at its real (draft) status on the detail screen', async () => {
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment.allocate': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
    http.post(`${API}/payments`, () => HttpResponse.json(paymentDetail({ id: 'pay1', status: 'draft' }), { status: 201 })),
    http.post(`${API}/payments/pay1/submit`, () =>
      HttpResponse.json({ detail: { code: 'not_draft', message: 'Payment is submitted, not draft' } }, { status: 422 })),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  await typeAmountAndSave(screen);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' }));
  expect(queryClient.getQueryData(keys.payment('pay1'))).toMatchObject({ status: 'draft' });
});

test('payment mutations refresh the order detail and the customer money side effects', async () => {
  // The order detail's `payment_status`/`summary.receivable` and the
  // customer's financial summary both move when money is recorded, and
  // neither is carried on a `PaymentDetailOut` — so both have to be
  // invalidated explicitly (see `hooks.afterPaymentMutation`).
  let orderCalls = 0;
  server.use(
    meRoute({ 'payment.create': 'all', 'payment_modes.read': 'all' }),
    http.get(`${API}/sales-orders/o1`, () => {
      orderCalls += 1;
      return HttpResponse.json(ORDER);
    }),
    modesRoute(),
    http.post(`${API}/payments`, () =>
      HttpResponse.json(paymentDetail({ id: 'pay1', status: 'draft', sales_order_id: 'o1', customer_id: 'c1' }), { status: 201 })),
  );

  // Nothing on this screen observes the financial summary, so a seeded copy
  // stays flagged rather than being refetched out from under the assertion.
  queryClient.setQueryData(keys.customerFinancialSummary('c1'), { customer_id: 'c1' });

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  expect(await screen.findByText('POS-26-27-000041')).toBeTruthy();
  await waitFor(() => expect(orderCalls).toBe(1));
  await typeAmountAndSave(screen);

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' }));
  // The order detail is observed by this very screen, so the invalidation
  // shows up as a real refetch rather than a lingering `isInvalidated` flag.
  await waitFor(() => expect(orderCalls).toBe(2));
  expect(queryClient.getQueryState(keys.customerFinancialSummary('c1'))?.isInvalidated).toBe(true);
});

test('opened with only a customer: no "This order" option, and the customer is the header', async () => {
  mockRouteParams = { customerId: 'c1' };
  let createBody: unknown;
  server.use(
    meRoute({ 'payment.create': 'all', 'payment_modes.read': 'all', 'customers.read': 'all' }),
    modesRoute(),
    http.get(`${API}/customers/c1`, () => HttpResponse.json({ id: 'c1', name: 'Arjun Mehta' })),
    http.post(`${API}/payments`, async ({ request }) => {
      createBody = await request.json();
      return HttpResponse.json(paymentDetail({ id: 'pay1', status: 'draft' }), { status: 201 });
    }),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  expect(await screen.findByText('Arjun Mehta')).toBeTruthy();
  expect(screen.queryByText('This order')).toBeNull();
  await typeAmountAndSave(screen, '5000');

  await waitFor(() => expect(createBody).toBeTruthy());
  expect(createBody).toMatchObject({ customer_id: 'c1', sales_order_id: null });
});

test('with no order and no customer, the screen asks for one and sends the picker back here', async () => {
  mockRouteParams = {};
  server.use(meRoute({ 'payment.create': 'all', 'payment_modes.read': 'all' }), modesRoute());

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  await fireEvent.press(await screen.findByText('CHOOSE CUSTOMER'));
  expect(mockNavigate).toHaveBeenCalledWith('CustomerSearch', { onPick: 'payment' });
});

test('offline: SAVE PAYMENT is out of reach and the screen says why', async () => {
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment.read': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  expect(await screen.findByText('POS-26-27-000041')).toBeTruthy();
  await fireEvent.changeText(await screen.findByLabelText('Amount'), '20000');
  expect(screen.getByRole('button', { name: 'SAVE PAYMENT' }).props.accessibilityState.disabled).toBe(false);

  await act(async () => { onlineManager.setOnline(false); });

  expect(screen.getByTestId('offline-banner')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'SAVE PAYMENT' }).props.accessibilityState.disabled).toBe(true);
});

test('a write with no connection fails fast with "No connection" instead of hanging', async () => {
  // `queryClient`'s `networkMode: 'always'` is what makes this settle at all:
  // TanStack's default would *pause* the mutation, leaving the button spinning
  // forever and firing the write later on reconnect — a duplicate payment.
  let postCalls = 0;
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment.read': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
    http.post(`${API}/payments`, () => {
      postCalls += 1;
      return HttpResponse.error();
    }),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  expect(await screen.findByText('POS-26-27-000041')).toBeTruthy();
  await typeAmountAndSave(screen);

  expect(await screen.findByText('No connection')).toBeTruthy();
  expect(postCalls).toBe(1);
  // Nothing navigated, and the button is live again rather than stuck loading.
  expect(mockNavigate).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'SAVE PAYMENT' }).props.accessibilityState.disabled).toBe(false),
  );
});

// M4-T8 (D1): the screen's own shape — a step bar naming what SAVE will do,
// "Against" and "Mode" as segmented controls (the mockup's `.seg`), and the
// amount as the hero field.
test('the form shows the Create/Submit/Allocate step bar and segmented Against + Mode controls', async () => {
  server.use(
    meRoute({ 'payment.create': 'all', 'payment.submit': 'all', 'payment.allocate': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute(),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  // Step bar (display-only here — nothing exists server-side until SAVE).
  expect(await screen.findByText('Create')).toBeTruthy();
  expect(screen.getByText('Submit')).toBeTruthy();
  expect(screen.getByText('Allocate')).toBeTruthy();

  // Against: a real segmented control, so each option is a button whose
  // selected state moves. Labels are uppercased by `Text variant="chip"`.
  const thisOrder = screen.getByRole('button', { name: 'THIS ORDER' });
  expect(thisOrder.props.accessibilityState.selected).toBe(true);
  const advance = screen.getByRole('button', { name: 'CUSTOMER ADVANCE' });
  expect(advance.props.accessibilityState.selected).toBe(false);
  await fireEvent.press(advance);
  expect(screen.getByRole('button', { name: 'CUSTOMER ADVANCE' }).props.accessibilityState.selected).toBe(true);

  // Three active modes (<= 4) render as segments rather than chips; segment
  // labels are uppercased by `Text variant="chip"`, so "Cash" reads "CASH".
  expect(await screen.findByText('CASH')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'CASH' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('button', { name: 'UPI' })).toBeTruthy();
});

test('above four active modes the segments become chips', async () => {
  server.use(
    meRoute({ 'payment.create': 'all', 'payment_modes.read': 'all' }),
    orderRoute(),
    modesRoute({
      items: [
        { id: 'pm1', name: 'Cash', is_active: true },
        { id: 'pm2', name: 'UPI', is_active: true },
        { id: 'pm3', name: 'Bank transfer', is_active: true },
        { id: 'pm4', name: 'Cheque', is_active: true },
        { id: 'pm5', name: 'Card', is_active: true },
      ],
      total: 5,
    }),
  );

  const screen = await render(
    <Providers>
      <RecordPaymentScreen />
    </Providers>,
  );

  // Chips uppercase their label (`Text variant="chip"`); a `Select` would have
  // shown the mode's own casing behind an accessible "Mode" field instead.
  expect(await screen.findByText('CHEQUE')).toBeTruthy();
  expect(screen.getByText('CARD')).toBeTruthy();
  await fireEvent.press(screen.getByText('CARD'));
  expect(screen.getByRole('button', { name: 'CARD' }).props.accessibilityState.selected).toBe(true);
});
