import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { InvoiceDetailScreen } from '@/features/invoices/screens/InvoiceDetailScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { invoiceDetail, me } from '@/test/fixtures';
import * as pdf from '@/native/pdf';
import { light } from '@/ui/tokens/colors';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: 'inv1' } }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  jest.restoreAllMocks();
});
afterAll(() => server.close());

const meRoute = (permissions: Record<string, string>) =>
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(me(permissions)));

const invoiceRoute = (over: Parameters<typeof invoiceDetail>[0] = {}) =>
  http.get('http://localhost:8000/api/v1/invoices/inv1', () => HttpResponse.json(invoiceDetail(over)));

test('a draft shows SUBMIT, which posts submit and moves the invoice on', async () => {
  let submitCalls = 0;
  server.use(
    meRoute({ 'invoice.read': 'own', 'invoice.submit': 'own' }),
    invoiceRoute({ status: 'draft', number: null }),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json(invoiceDetail({ status: 'submitted', number: 'INV-26-27-000007' }));
    }),
  );

  const { findByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  // Whole-DN invoicing: the notes this invoice bills are named, and the lines
  // are the sum over them.
  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(await findByText('SUBMIT'));

  await waitFor(() => expect(submitCalls).toBe(1));
  expect(await findByText('SUBMITTED')).toBeTruthy();
});

test('without invoice.submit the step is still named, but the button is blocked', async () => {
  server.use(meRoute({ 'invoice.read': 'own' }), invoiceRoute({ status: 'draft', number: null }));

  const { findByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect(await findByText('SUBMIT')).toBeTruthy();
  // Human copy, never the raw permission code.
  expect(await findByText('Someone with billing rights needs to submit this invoice')).toBeTruthy();
});

test('a submitted invoice has no SUBMIT at all', async () => {
  server.use(
    meRoute({ 'invoice.read': 'own', 'invoice.submit': 'own' }),
    invoiceRoute({ status: 'submitted' }),
  );

  const { findAllByText, queryByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect((await findAllByText('INV-26-27-000007')).length).toBeGreaterThan(0);
  expect(queryByText('SUBMIT')).toBeNull();
});

test('RECORD PAYMENT is offered only on a submitted invoice, and only with payment.create', async () => {
  server.use(
    meRoute({ 'invoice.read': 'own', 'payment.create': 'own' }),
    invoiceRoute({ status: 'submitted' }),
  );

  const { findByText, getByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect(await findByText('RECORD PAYMENT')).toBeTruthy();
  await fireEvent.press(getByText('RECORD PAYMENT'));
  expect(mockNavigate).toHaveBeenCalledWith('RecordPayment', {
    orderId: 'o1',
    customerId: 'c1',
    invoiceId: 'inv1',
  });
});

test('a draft owes nothing yet, so it is never payable', async () => {
  server.use(
    meRoute({ 'invoice.read': 'own', 'payment.create': 'own' }),
    invoiceRoute({ status: 'draft', number: null }),
  );

  const { findByText, queryByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect(await findByText('DRAFT')).toBeTruthy();
  expect(queryByText('RECORD PAYMENT')).toBeNull();
});

test('without payment.create a submitted invoice offers no payment action', async () => {
  server.use(meRoute({ 'invoice.read': 'own' }), invoiceRoute({ status: 'submitted' }));

  const { findAllByText, queryByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect((await findAllByText('INV-26-27-000007')).length).toBeGreaterThan(0);
  expect(queryByText('RECORD PAYMENT')).toBeNull();
});

test('the PDF action downloads and opens this invoice', async () => {
  server.use(meRoute({ 'invoice.read': 'own' }), invoiceRoute({ status: 'submitted' }));
  const pdfSpy = jest
    .spyOn(pdf, 'downloadAuthedPdf')
    .mockResolvedValue('file:///mock/documents/ace/INV-26-27-000007.pdf');
  const openSpy = jest.spyOn(pdf, 'openPdf').mockResolvedValue(undefined);

  const { findAllByText, findByLabelText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect((await findAllByText('INV-26-27-000007')).length).toBeGreaterThan(0);
  await fireEvent.press(await findByLabelText('Download PDF'));

  await waitFor(() =>
    expect(pdfSpy).toHaveBeenCalledWith({ path: '/invoices/inv1/pdf', fileName: 'INV-26-27-000007.pdf' }));
  expect(openSpy).toHaveBeenCalledWith('file:///mock/documents/ace/INV-26-27-000007.pdf', 'INV-26-27-000007');
});

test('CANCEL INVOICE is a draft-only, invoice.cancel-only action and sends a reason', async () => {
  let cancelBody: unknown;
  server.use(
    meRoute({ 'invoice.read': 'own', 'invoice.cancel': 'own' }),
    invoiceRoute({ status: 'draft', number: null }),
    http.post('http://localhost:8000/api/v1/invoices/inv1/cancel', async ({ request }) => {
      cancelBody = await request.json();
      return HttpResponse.json(invoiceDetail({ status: 'cancelled', cancel_reason: 'Wrong note' }));
    }),
  );

  const screen = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  await fireEvent.press(await screen.findByText('CANCEL INVOICE'));
  await fireEvent.changeText(
    await screen.findByPlaceholderText('Why is this invoice being cancelled?'),
    'Wrong note',
  );
  await fireEvent.press(screen.getAllByText('CANCEL INVOICE')[1]!);

  await waitFor(() => expect(cancelBody).toEqual({ reason: 'Wrong note' }));
  expect(await screen.findByText('CANCELLED')).toBeTruthy();
});

test('without invoice.cancel there is no cancel action', async () => {
  server.use(meRoute({ 'invoice.read': 'own' }), invoiceRoute({ status: 'draft', number: null }));

  const { findByText, queryByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect(await findByText('DRAFT')).toBeTruthy();
  expect(queryByText('CANCEL INVOICE')).toBeNull();
});

test('a submitted invoice cannot be cancelled from here — it has a number and may be paid', async () => {
  server.use(
    meRoute({ 'invoice.read': 'own', 'invoice.cancel': 'own' }),
    invoiceRoute({ status: 'submitted' }),
  );

  const { findAllByText, queryByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect((await findAllByText('INV-26-27-000007')).length).toBeGreaterThan(0);
  expect(queryByText('CANCEL INVOICE')).toBeNull();
});

test('the money block shows taxable, the GST split and the net', async () => {
  server.use(meRoute({ 'invoice.read': 'own' }), invoiceRoute({ status: 'submitted' }));

  const { findByText, getAllByText, getByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect(await findByText('₹20,958.00')).toBeTruthy(); // net
  // Taxable on the header card, and the same figure again as the single
  // line's pre-tax amount — the lines column adds up to it by construction.
  expect(getAllByText('₹19,960.00')).toHaveLength(2);
  // The rate is read off the invoice's own lines, never hard-coded.
  expect(getByText('CGST 2.5% + SGST 2.5%')).toBeTruthy();
  expect(getByText('₹998.00')).toBeTruthy(); // tax
});

test('what is still owed reads danger, and a settled invoice does not — money compared as money', async () => {
  server.use(
    meRoute({ 'invoice.read': 'own' }),
    invoiceRoute({ status: 'submitted', paid_amount: '0.00', outstanding: '20958.00' }),
  );

  const { findByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect(await findByText('OUTSTANDING ₹20,958.00')).toHaveStyle({ color: light.tone.danger.fg });
});

test("a fully paid invoice's outstanding chip is neutral, whatever shape the zero arrives in", async () => {
  // `'0'`, not `'0.00'`: `cmpMoney` reads both as zero paise, which is the
  // whole point of comparing money with money rather than with `Number`.
  server.use(
    meRoute({ 'invoice.read': 'own' }),
    invoiceRoute({ status: 'submitted', paid_amount: '20958.00', outstanding: '0' }),
  );

  const { findByText } = await render(
    <Providers>
      <InvoiceDetailScreen />
    </Providers>,
  );

  expect(await findByText('OUTSTANDING ₹0.00')).toHaveStyle({ color: light.tone.neutral.fg });
});
