import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CreateInvoiceScreen } from '@/features/invoices/screens/CreateInvoiceScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';
import { localDate, todayIso, todayLocalDate } from '@/lib/format/date';
import { invoiceDetail, invoiceable, invoiceableItem, me, orderDetail } from '@/test/fixtures';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = { orderId: 'o1' };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  mockNavigate.mockClear();
  mockReplace.mockClear();
  mockGoBack.mockClear();
  mockRouteParams = { orderId: 'o1' };
});
afterAll(() => server.close());

const meRoute = (permissions: Record<string, string>) =>
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(me(permissions)));

const TWO_NOTES = invoiceable({
  items: [
    invoiceableItem(),
    invoiceableItem({
      dn_id: 'dn2',
      number: 'DN-26-27-000008',
      delivered_on: '2026-08-18',
      qty_total: '4',
      net: '9980.00',
      lines_count: 1,
    }),
  ],
});

const invoiceableRoute = (payload = TWO_NOTES) =>
  http.get('http://localhost:8000/api/v1/sales-orders/o1/invoiceable', () => HttpResponse.json(payload));

const CREATE_PERMS = { 'invoice.read': 'own', 'invoice.create': 'own', 'invoice.submit': 'own' };

test('the invoiceable notes are listed whole (no quantities), and only the selected one is invoiced', async () => {
  let createBody: unknown;
  server.use(
    meRoute(CREATE_PERMS),
    invoiceableRoute(),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/invoices', async ({ request }) => {
      createBody = await request.json();
      return HttpResponse.json(invoiceDetail({ status: 'draft', number: null }), { status: 201 });
    }),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () =>
      HttpResponse.json(invoiceDetail({ status: 'submitted' }))),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }))),
  );

  const { findByText, getAllByText, getByText, getByLabelText, queryByText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  // Both delivered notes, each as a whole: number, when it was delivered, how
  // many units it carries and what it is worth. No per-line quantity anywhere.
  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  expect(getByText('DN-26-27-000008')).toBeTruthy();
  expect(getByText('2 delivery notes ready to invoice')).toBeTruthy();
  // The screen's own two steps, named for what the rep is about to do.
  expect(getByText('Create')).toBeTruthy();
  expect(getByText('Submit')).toBeTruthy();
  // Nothing is preselected — which notes go on a financial document is always
  // a deliberate choice — so there is no total yet.
  expect(queryByText('INVOICE TOTAL')).toBeNull();

  await fireEvent.press(getByLabelText('Select DN-26-27-000007'));
  // The running total is the Σ of the selected notes' own `net` (string
  // arithmetic, never `Number(a) + Number(b)`): the note's value and the
  // invoice total now both read ₹19,960.00.
  expect(await findByText('INVOICE TOTAL')).toBeTruthy();
  expect(getAllByText('₹19,960.00')).toHaveLength(2);
  // The note's `net` is already tax-inclusive (a DN snapshots its own
  // gross → taxable → tax → net), and whole-DN invoicing bills each ticked
  // note entire — so this running sum *is* what the invoice will bill.
  expect(getByText("1 of 2 notes · incl. GST — each note's own total")).toBeTruthy();

  await fireEvent.press(getByText('CREATE INVOICE'));

  await waitFor(() => expect(createBody).toBeTruthy());
  expect(createBody).toEqual({
    dn_ids: ['dn1'],
    invoice_date: todayIso(),
    due_date: null,
    remarks: null,
  });
});

test('create chains straight into submit, says so, and lands back on the order', async () => {
  let submitCalls = 0;
  server.use(
    meRoute(CREATE_PERMS),
    invoiceableRoute(),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/invoices', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }), { status: 201 })),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json(invoiceDetail({ status: 'submitted', number: 'INV-26-27-000007' }));
    }),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }))),
  );

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(getByLabelText('Select DN-26-27-000007'));
  await fireEvent.press(getByText('CREATE INVOICE'));

  await waitFor(() => expect(submitCalls).toBe(1));
  expect(await findByText('Invoice INV-26-27-000007 submitted')).toBeTruthy();
  // `replace`, not `navigate`: the half-finished create screen must not be
  // sitting behind the order for the back button to fall into.
  expect(mockReplace).toHaveBeenCalledWith('OrderDetail', { id: 'o1' });
});

test('a failed submit leaves the real draft on screen with CONTINUE, not a lost invoice', async () => {
  let submitCalls = 0;
  server.use(
    meRoute(CREATE_PERMS),
    invoiceableRoute(),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/invoices', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }), { status: 201 })),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json({ detail: { code: 'state_code_missing', message: 'no state code' } }, { status: 422 });
    }),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }))),
  );

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(getByLabelText('Select DN-26-27-000007'));
  await fireEvent.press(getByText('CREATE INVOICE'));

  await waitFor(() => expect(submitCalls).toBe(1));
  // The failure is named in the billing vocabulary…
  expect(await findByText(/GST state code is missing/)).toBeTruthy();
  // …and the draft that *was* created is still here, one tap from submitting.
  expect(await findByText('CONTINUE')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('resuming a draft opens at the Submit step and submits the existing invoice', async () => {
  mockRouteParams = { orderId: 'o1', invoiceId: 'inv1' };
  let submitCalls = 0;
  let invoiceableCalls = 0;
  server.use(
    meRoute(CREATE_PERMS),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/invoiceable', () => {
      invoiceableCalls += 1;
      return HttpResponse.json(TWO_NOTES);
    }),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }))),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json(invoiceDetail({ status: 'submitted', number: 'INV-26-27-000007' }));
    }),
  );

  const { findByText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  // The note picker is gone — this invoice's notes are already chosen.
  const continueButton = await findByText('CONTINUE');
  expect(invoiceableCalls).toBe(0);
  await fireEvent.press(continueButton);

  await waitFor(() => expect(submitCalls).toBe(1));
  expect(mockReplace).toHaveBeenCalledWith('OrderDetail', { id: 'o1' });
});

test('a note preselected from its own delivery note is already ticked', async () => {
  mockRouteParams = { orderId: 'o1', dnId: 'dn2' };
  let createBody: unknown;
  server.use(
    meRoute(CREATE_PERMS),
    invoiceableRoute(),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/invoices', async ({ request }) => {
      createBody = await request.json();
      return HttpResponse.json(invoiceDetail({ status: 'draft', number: null }), { status: 201 });
    }),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () =>
      HttpResponse.json(invoiceDetail({ status: 'submitted', number: 'INV-26-27-000007' }))),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }))),
  );

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000008')).toBeTruthy();
  expect(getByLabelText('Deselect DN-26-27-000008')).toBeTruthy();
  await fireEvent.press(getByText('CREATE INVOICE'));

  await waitFor(() => expect(createBody).toBeTruthy());
  expect(createBody).toEqual({ dn_ids: ['dn2'], invoice_date: todayIso(), due_date: null, remarks: null });
});

test('nothing left to invoice is an empty state, not an empty list', async () => {
  server.use(meRoute(CREATE_PERMS), invoiceableRoute(invoiceable({ items: [] })));

  const { findByText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('Nothing to invoice')).toBeTruthy();
});

test('a refused create names the offending note and refreshes what is still invoiceable', async () => {
  let invoiceableCalls = 0;
  server.use(
    meRoute(CREATE_PERMS),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/invoiceable', () => {
      invoiceableCalls += 1;
      return HttpResponse.json(TWO_NOTES);
    }),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/invoices', () =>
      HttpResponse.json(
        {
          detail: {
            code: 'dn_not_eligible',
            message: 'Delivery note DN-26-27-000007 is delivered and already invoiced',
            dn_number: 'DN-26-27-000007',
          },
        },
        { status: 422 },
      )),
  );

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(getByLabelText('Select DN-26-27-000007'));
  await fireEvent.press(getByText('CREATE INVOICE'));

  expect(await findByText(/DN-26-27-000007: That delivery note can't be invoiced/)).toBeTruthy();
  await waitFor(() => expect(invoiceableCalls).toBeGreaterThan(1)); // the initial load + the recovery refetch
});

test('creating an invoice restages the order and what is still invoiceable', async () => {
  let invoiceableCalls = 0;
  server.use(
    meRoute(CREATE_PERMS),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/invoiceable', () => {
      invoiceableCalls += 1;
      return HttpResponse.json(TWO_NOTES);
    }),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/invoices', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }), { status: 201 })),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () =>
      HttpResponse.json(invoiceDetail({ status: 'submitted', number: 'INV-26-27-000007' }))),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }))),
  );

  queryClient.setQueryData(keys.order('o1'), orderDetail({ id: 'o1' }));

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(getByLabelText('Select DN-26-27-000007'));
  await fireEvent.press(getByText('CREATE INVOICE'));

  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  // The order behind it — its `invoice_status`, `summary.invoiced_value` and
  // its `invoices` list all moved, and the invoice response carries none of it.
  expect(queryClient.getQueryState(keys.order('o1'))?.isInvalidated).toBe(true);
  // And what is still invoiceable: the note this invoice claimed is gone from
  // it, which is why the list was re-asked rather than left cached.
  await waitFor(() => expect(invoiceableCalls).toBeGreaterThan(1));
});

test('a rep who cannot submit stops at the draft and is shown where it went', async () => {
  let submitCalls = 0;
  server.use(
    meRoute({ 'invoice.read': 'own', 'invoice.create': 'own' }),
    invoiceableRoute(),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/invoices', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }), { status: 201 })),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json(invoiceDetail({ status: 'submitted' }));
    }),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'draft', number: null }))),
  );

  const { findByText, getByText, getByLabelText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(getByLabelText('Select DN-26-27-000007'));
  await fireEvent.press(getByText('CREATE INVOICE'));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('InvoiceDetail', { id: 'inv1' }));
  expect(submitCalls).toBe(0);
});

test('resuming an invoice someone else already submitted offers no CONTINUE, only its own page', async () => {
  // The resume step is the *server's*, not "you created it, now submit it":
  // the same screen is reached from the order's Invoices card, and by then the
  // invoice may already be finished — or cancelled.
  mockRouteParams = { orderId: 'o1', invoiceId: 'inv1' };
  let submitCalls = 0;
  server.use(
    meRoute(CREATE_PERMS),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'submitted', number: 'INV-26-27-000007' }))),
    http.post('http://localhost:8000/api/v1/invoices/inv1/submit', () => {
      submitCalls += 1;
      return HttpResponse.json(invoiceDetail({ status: 'submitted' }));
    }),
  );

  const { findByText, getByText, queryByText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  // The real status, said plainly — not "this invoice is still a draft".
  expect(await findByText('This invoice has been submitted')).toBeTruthy();
  expect(getByText('SUBMITTED')).toBeTruthy();
  expect(queryByText('CONTINUE')).toBeNull();

  await fireEvent.press(getByText('OPEN INVOICE'));
  expect(mockReplace).toHaveBeenCalledWith('InvoiceDetail', { id: 'inv1' });
  expect(submitCalls).toBe(0);
});

test('a cancelled invoice cannot be resumed either — it says so and offers no submit', async () => {
  mockRouteParams = { orderId: 'o1', invoiceId: 'inv1' };
  server.use(
    meRoute(CREATE_PERMS),
    http.get('http://localhost:8000/api/v1/invoices/inv1', () =>
      HttpResponse.json(invoiceDetail({ status: 'cancelled', cancel_reason: 'Wrong note' }))),
  );

  const { findByText, getByText, queryByText } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('This invoice was cancelled')).toBeTruthy();
  expect(getByText('CANCELLED')).toBeTruthy();
  expect(queryByText('CONTINUE')).toBeNull();
});

test('the invoice date cannot be in the future, nor precede the notes it bills', async () => {
  server.use(meRoute(CREATE_PERMS), invoiceableRoute());

  const { findByText, getByLabelText, getByTestId } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  // Both notes: delivered 16 Aug and 18 Aug. The floor is the *later* of the
  // two — an invoice dated before a note it bills is refused server-side
  // (`invoice_date_before_delivery`).
  await fireEvent.press(getByLabelText('Select DN-26-27-000007'));
  await fireEvent.press(getByLabelText('Select DN-26-27-000008'));

  await fireEvent.press(getByLabelText('Invoice date'));
  const picker = getByTestId('date-time-picker');
  expect(picker.props.minimumDate).toEqual(localDate('2026-08-18'));
  expect(picker.props.maximumDate).toEqual(todayLocalDate());
});

test('the due date cannot fall before the invoice date', async () => {
  server.use(meRoute(CREATE_PERMS), invoiceableRoute());

  const { findByText, getByLabelText, getByTestId } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(getByLabelText('Due date'));

  // The invoice date defaults to today, so that is the floor (the server's
  // `due_date_before_invoice_date`); a due date has no ceiling at all.
  const picker = getByTestId('date-time-picker');
  expect(picker.props.minimumDate).toEqual(localDate(todayIso()));
  expect(picker.props.maximumDate).toBeUndefined();
});

test('with no note ticked yet the invoice date has only its future bound', async () => {
  server.use(meRoute(CREATE_PERMS), invoiceableRoute());

  const { findByText, getByLabelText, getByTestId } = await render(
    <Providers>
      <CreateInvoiceScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(getByLabelText('Invoice date'));

  const picker = getByTestId('date-time-picker');
  expect(picker.props.minimumDate).toBeUndefined();
  expect(picker.props.maximumDate).toEqual(todayLocalDate());
});
