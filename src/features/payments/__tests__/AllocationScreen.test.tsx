import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AllocationScreen } from '@/features/payments/screens/AllocationScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { me, paymentDetail } from '@/test/fixtures';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = { paymentId: 'pay1' };
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
  mockRouteParams = { paymentId: 'pay1' };
});
afterAll(() => server.close());

const API = 'http://localhost:8000/api/v1';

const meRoute = (permissions: Record<string, string>) =>
  http.get(`${API}/auth/me`, () => HttpResponse.json(me(permissions)));

const PAYMENT = paymentDetail({
  id: 'pay1',
  status: 'submitted',
  amount: '20000.00',
  allocated: '0.00',
  unallocated: '20000.00',
  sales_order_id: 'o1',
  so_number: 'POS-26-27-000041',
});

const SUGGESTION = {
  allocations: [
    {
      invoice_id: 'i1', invoice_number: 'INV-26-27-000003', so_id: 'o1', so_number: 'POS-26-27-000041',
      due_date: '2026-09-10', net: '11200.00', outstanding: '11200.00', amount: '11200.00',
    },
    {
      invoice_id: 'i2', invoice_number: 'INV-26-27-000004', so_id: 'o2', so_number: 'POS-26-27-000042',
      due_date: '2026-09-20', net: '9000.00', outstanding: '9000.00', amount: '8800.00',
    },
  ],
  unallocated_after: '0.00',
};

const baseRoutes = () => [
  meRoute({ 'payment.read': 'all', 'payment.allocate': 'all' }),
  http.get(`${API}/payments/pay1`, () => HttpResponse.json(PAYMENT)),
  http.get(`${API}/payments/pay1/suggest-allocation`, () => HttpResponse.json(SUGGESTION)),
];

test('rows arrive prefilled from the FIFO suggestion, with the invoice, order and due date on each', async () => {
  server.use(...baseRoutes());

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  expect(await screen.findByText('INV-26-27-000003 · POS-26-27-000041')).toBeTruthy();
  expect(screen.getByText('Due 10 Sep 2026 · ₹11,200.00 outstanding')).toBeTruthy();
  expect(screen.getByLabelText('INV-26-27-000003 amount').props.value).toBe('11200.00');
  expect(screen.getByLabelText('INV-26-27-000004 amount').props.value).toBe('8800.00');
  expect(screen.getByText('Allocated ₹20,000.00 · Unallocated ₹0.00')).toBeTruthy();
});

test('editing one row updates the running totals exactly', async () => {
  server.use(...baseRoutes());

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  await fireEvent.changeText(await screen.findByLabelText('INV-26-27-000004 amount'), '800.50');
  expect(await screen.findByText('Allocated ₹12,000.50 · Unallocated ₹7,999.50')).toBeTruthy();
});

test('a row over its invoice outstanding shows the row error and blocks SAVE', async () => {
  server.use(...baseRoutes());

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  await fireEvent.changeText(await screen.findByLabelText('INV-26-27-000003 amount'), '11200.01');
  expect(await screen.findByText('Only ₹11,200.00 is outstanding on this invoice')).toBeTruthy();
  expect(screen.getByText('SAVE ALLOCATION').parent).toBeTruthy();

  // Pushing past the payment itself over-allocates: SAVE refuses to fire.
  await fireEvent.changeText(screen.getByLabelText('INV-26-27-000003 amount'), '30000');
  expect(await screen.findByText('Over-allocated by ₹18,800.00')).toBeTruthy();
  await fireEvent.press(screen.getByText('SAVE ALLOCATION'));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('SAVE puts only the non-zero rows, then shows the different_order warning before the detail', async () => {
  let putBody: unknown;
  server.use(
    ...baseRoutes(),
    http.put(`${API}/payments/pay1/allocations`, async ({ request }) => {
      putBody = await request.json();
      return HttpResponse.json(
        paymentDetail({
          id: 'pay1',
          status: 'submitted',
          amount: '20000.00',
          allocated: '11200.00',
          unallocated: '8800.00',
          warnings: [
            { code: 'different_order', invoice_number: 'INV-26-27-000004', message: 'Invoice INV-26-27-000004 belongs to order POS-26-27-000042, not the order this payment was recorded against' },
          ],
        }),
      );
    }),
  );

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  await fireEvent.changeText(await screen.findByLabelText('INV-26-27-000004 amount'), '0');
  await fireEvent.press(screen.getByText('SAVE ALLOCATION'));

  await waitFor(() => expect(putBody).toBeTruthy());
  expect(putBody).toEqual({ allocations: [{ invoice_id: 'i1', amount: '11200.00' }] });

  expect(await screen.findByText('Invoice INV-26-27-000004 belongs to order POS-26-27-000042, not the order this payment was recorded against')).toBeTruthy();
  await fireEvent.press(screen.getByText('VIEW PAYMENT'));
  expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' });
});

test('a clean save goes straight to the payment detail', async () => {
  server.use(
    ...baseRoutes(),
    http.put(`${API}/payments/pay1/allocations`, () =>
      HttpResponse.json(paymentDetail({ id: 'pay1', status: 'submitted', amount: '20000.00', allocated: '20000.00', unallocated: '0.00' }))),
  );

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  expect(await screen.findByLabelText('INV-26-27-000003 amount')).toBeTruthy();
  await fireEvent.press(screen.getByText('SAVE ALLOCATION'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PaymentDetail', { id: 'pay1' }));
});

test('a 422 from the server is rendered with the payments error copy and nothing navigates', async () => {
  server.use(
    ...baseRoutes(),
    http.put(`${API}/payments/pay1/allocations`, () =>
      HttpResponse.json({ detail: { code: 'invoice_over_allocated', message: 'over', invoice_number: 'INV-26-27-000003' } }, { status: 422 })),
  );

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  expect(await screen.findByLabelText('INV-26-27-000003 amount')).toBeTruthy();
  await fireEvent.press(screen.getByText('SAVE ALLOCATION'));

  expect(await screen.findByText('That invoice would be over-paid by this allocation.')).toBeTruthy();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('SUGGEST (FIFO) re-seeds the rows from a fresh suggestion', async () => {
  let suggestCalls = 0;
  server.use(
    meRoute({ 'payment.read': 'all', 'payment.allocate': 'all' }),
    http.get(`${API}/payments/pay1`, () => HttpResponse.json(PAYMENT)),
    http.get(`${API}/payments/pay1/suggest-allocation`, () => {
      suggestCalls += 1;
      return HttpResponse.json(SUGGESTION);
    }),
  );

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  await fireEvent.changeText(await screen.findByLabelText('INV-26-27-000003 amount'), '1');
  expect(await screen.findByText('Allocated ₹8,801.00 · Unallocated ₹11,199.00')).toBeTruthy();

  await fireEvent.press(screen.getByText('SUGGEST (FIFO)'));
  await waitFor(() => expect(suggestCalls).toBe(2));
  expect(await screen.findByText('Allocated ₹20,000.00 · Unallocated ₹0.00')).toBeTruthy();
});

test('an invoiceId in the route is the row the screen opens focused on', async () => {
  mockRouteParams = { paymentId: 'pay1', invoiceId: 'i2' };
  server.use(...baseRoutes());

  const screen = await render(
    <Providers>
      <AllocationScreen />
    </Providers>,
  );

  expect((await screen.findByLabelText('INV-26-27-000004 amount')).props.autoFocus).toBe(true);
  expect(screen.getByLabelText('INV-26-27-000003 amount').props.autoFocus).toBeFalsy();
});
