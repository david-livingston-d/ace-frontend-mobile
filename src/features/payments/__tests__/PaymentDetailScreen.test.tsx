import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { PaymentDetailScreen } from '@/features/payments/screens/PaymentDetailScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { me, paymentDetail } from '@/test/fixtures';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: 'pay1' } }),
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

const API = 'http://localhost:8000/api/v1';

const meRoute = (permissions: Record<string, string>) =>
  http.get(`${API}/auth/me`, () => HttpResponse.json(me(permissions)));

const ALLOCATED = paymentDetail({
  id: 'pay1',
  number: 'PMT-26-27-000012',
  status: 'submitted',
  sales_order_id: 'o1',
  so_number: 'POS-26-27-000041',
  payment_mode_name: 'UPI',
  reference: 'UTR-778899',
  amount: '20000.00',
  allocated: '11200.00',
  unallocated: '8800.00',
  remarks: 'Part payment on delivery',
  allocations: [
    {
      id: 'a1', invoice_id: 'i1', invoice_number: 'INV-26-27-000003', invoice_date: '2026-08-20', due_date: '2026-09-10',
      so_id: 'o1', so_number: 'POS-26-27-000041', net: '11200.00', paid_amount: '11200.00', outstanding: '0.00', amount: '11200.00',
    },
  ],
});

test('the header, amounts and allocation rows read off the payment the server sent', async () => {
  server.use(meRoute({ 'payment.read': 'all' }), http.get(`${API}/payments/pay1`, () => HttpResponse.json(ALLOCATED)));

  const screen = await render(
    <Providers>
      <PaymentDetailScreen />
    </Providers>,
  );

  expect(await screen.findByText('PMT-26-27-000012')).toBeTruthy();
  expect(screen.getByText('SUBMITTED')).toBeTruthy();
  expect(screen.getByText('Arjun Mehta')).toBeTruthy();
  expect(screen.getByText('POS-26-27-000041')).toBeTruthy();
  expect(screen.getByText('UPI · 27 Aug 2026 · UTR-778899')).toBeTruthy();
  expect(screen.getByText('₹20,000.00')).toBeTruthy();
  expect(screen.getByText('Allocated ₹11,200.00 · Unallocated ₹8,800.00')).toBeTruthy();
  expect(screen.getByText('INV-26-27-000003 · POS-26-27-000041')).toBeTruthy();
  expect(screen.getByText('Part payment on delivery')).toBeTruthy();
  // Submitted with allocations = step 2 of Recorded/Submitted/Allocated.
  expect(screen.getByText('Allocated')).toBeTruthy();
});

test('CONTINUE is "Allocate" for a submitted payment with money left, and opens the allocation screen', async () => {
  server.use(meRoute({ 'payment.read': 'all', 'payment.allocate': 'all' }), http.get(`${API}/payments/pay1`, () => HttpResponse.json(ALLOCATED)));

  const screen = await render(
    <Providers>
      <PaymentDetailScreen />
    </Providers>,
  );

  await fireEvent.press(await screen.findByText('ALLOCATE'));
  expect(mockNavigate).toHaveBeenCalledWith('Allocation', { paymentId: 'pay1' });
});

test('a draft payment submits from CONTINUE and re-renders at its new status', async () => {
  let submitCalls = 0;
  server.use(
    meRoute({ 'payment.read': 'all', 'payment.submit': 'all' }),
    http.get(`${API}/payments/pay1`, () => HttpResponse.json(paymentDetail({ id: 'pay1', number: null, status: 'draft' }))),
    http.post(`${API}/payments/pay1/submit`, () => {
      submitCalls += 1;
      return HttpResponse.json(paymentDetail({ id: 'pay1', number: 'PMT-26-27-000012', status: 'submitted', amount: '5000.00', unallocated: '5000.00' }));
    }),
  );

  const screen = await render(
    <Providers>
      <PaymentDetailScreen />
    </Providers>,
  );

  expect(await screen.findByText('Draft')).toBeTruthy();
  await fireEvent.press(await screen.findByText('SUBMIT'));

  await waitFor(() => expect(submitCalls).toBe(1));
  expect(await screen.findByText('PMT-26-27-000012')).toBeTruthy();
});

test('without the next step\'s permission CONTINUE is disabled with the hint, not hidden', async () => {
  server.use(
    meRoute({ 'payment.read': 'all' }),
    http.get(`${API}/payments/pay1`, () => HttpResponse.json(paymentDetail({ id: 'pay1', status: 'draft' }))),
  );

  const screen = await render(
    <Providers>
      <PaymentDetailScreen />
    </Providers>,
  );

  expect(await screen.findByText('SUBMIT')).toBeTruthy();
  // The hint is human copy, never the raw permission code (`PERMISSION_HINTS`).
  expect(await screen.findByText('Someone with payment approval rights needs to finish this')).toBeTruthy();
});

test('Cancel is only offered with payment.cancel, and posts the reason', async () => {
  let cancelBody: unknown;
  server.use(
    meRoute({ 'payment.read': 'all', 'payment.cancel': 'all' }),
    http.get(`${API}/payments/pay1`, () => HttpResponse.json(ALLOCATED)),
    http.post(`${API}/payments/pay1/cancel`, async ({ request }) => {
      cancelBody = await request.json();
      return HttpResponse.json(paymentDetail({ id: 'pay1', status: 'cancelled', cancel_reason: 'Cheque bounced' }));
    }),
  );

  const screen = await render(
    <Providers>
      <PaymentDetailScreen />
    </Providers>,
  );

  await fireEvent.press(await screen.findByText('CANCEL PAYMENT'));
  await fireEvent.changeText(await screen.findByPlaceholderText('Why is this payment being cancelled?'), 'Cheque bounced');
  await fireEvent.press(screen.getAllByText('CANCEL PAYMENT')[1]!);

  await waitFor(() => expect(cancelBody).toEqual({ reason: 'Cheque bounced' }));
  expect(await screen.findByText('CANCELLED')).toBeTruthy();
});

test('a viewer without payment.cancel never sees the cancel action', async () => {
  server.use(meRoute({ 'payment.read': 'all' }), http.get(`${API}/payments/pay1`, () => HttpResponse.json(ALLOCATED)));

  const screen = await render(
    <Providers>
      <PaymentDetailScreen />
    </Providers>,
  );

  expect(await screen.findByText('PMT-26-27-000012')).toBeTruthy();
  expect(screen.queryByText('CANCEL PAYMENT')).toBeNull();
});

test('warnings from the last allocation are shown on the detail', async () => {
  server.use(
    meRoute({ 'payment.read': 'all' }),
    http.get(`${API}/payments/pay1`, () =>
      HttpResponse.json(paymentDetail({
        id: 'pay1', status: 'submitted', amount: '5000.00', allocated: '5000.00', unallocated: '0.00',
        warnings: [{ code: 'different_order', invoice_number: 'INV-9', message: 'Invoice INV-9 belongs to another order' }],
      }))),
  );

  const screen = await render(
    <Providers>
      <PaymentDetailScreen />
    </Providers>,
  );

  expect(await screen.findByText('Invoice INV-9 belongs to another order')).toBeTruthy();
});
