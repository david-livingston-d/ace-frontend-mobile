import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { OrderDetailScreen } from '@/features/orders/screens/OrderDetailScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import type { SalesOrderDetail } from '@/lib/api/types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: 'o1' } }),
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

const me = (permissions: Record<string, string>) =>
  http.get('http://localhost:8000/api/v1/auth/me', () =>
    HttpResponse.json({
      id: 'u1',
      email: 'k@ace.in',
      name: 'Karthik S',
      is_superadmin: false,
      permissions,
      department_id: null,
      team_id: null,
      roles: [],
    }));

function baseOrder(overrides: Partial<SalesOrderDetail> = {}): SalesOrderDetail {
  return {
    id: 'o1',
    number: 'POS-26-27-000041',
    customer_id: 'c1',
    customer_name: 'Arjun Mehta',
    customer_gstin: null,
    billing_address: {},
    shipping_address: {},
    place_of_supply_state: 'TN',
    payment_terms_id: null,
    payment_terms_name: null,
    payment_terms_days: null,
    sales_user_id: 'u1',
    sales_user_name: 'Karthik S',
    department_id: null,
    team_id: null,
    warehouse_id: 'w1',
    warehouse_name: 'Main warehouse',
    order_date: '2026-08-12',
    expected_delivery_date: '2026-08-20',
    remarks: null,
    order_discount_pct: '0',
    gross: '99800.00',
    line_discount: '0.00',
    order_discount: '0.00',
    taxable: '99800.00',
    tax: '0.00',
    net: '99800.00',
    phase: 'draft',
    reservation_status: 'not_reserved',
    delivery_status: 'not_delivered',
    invoice_status: 'not_invoiced',
    payment_status: 'unpaid',
    verified_by: null,
    verified_by_name: null,
    verified_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    closed_by: null,
    closed_at: null,
    close_reason: null,
    created_by: null,
    created_at: '2026-08-12T10:00:00Z',
    summary: {
      order_value: '99800.00',
      advance_received: '0.00',
      delivered_value: '0.00',
      invoiced_value: '0.00',
      paid_amount: '0.00',
      receivable: '99800.00',
      unbilled_delivered_value: '0.00',
      ordered_qty: '40',
      reserved_qty: '0',
      delivered_qty: '0',
      invoiced_qty: '0',
      open_shortage_count: 0,
    },
    lines: [
      {
        id: 'l1',
        line_no: 1,
        variant_id: 'v1',
        product_id: 'p1',
        sku: 'SKU-1',
        product_name: 'Shirt',
        variant_label: 'M / Blue',
        hsn_code: '6109',
        uom: 'PCS',
        qty: '40',
        rate: '2495.00',
        discount_pct: '0',
        discount_amount: '0.00',
        order_discount_amount: '0.00',
        taxable_amount: '99800.00',
        tax_rate: '0',
        tax_amount: '0.00',
        line_total: '99800.00',
        reserved_qty: '0',
        delivered_qty: '0',
        invoiced_qty: '0',
        invoiceable_qty: '0',
        remaining_qty: '40',
        deliverable: '0',
        remarks: null,
      },
    ],
    reservations: [],
    delivery_notes: [],
    invoices: [],
    payments: [],
    shortages: [],
    warnings: [],
    ...overrides,
  };
}

test('draft order: header + net + collapsed tax breakdown + verify flow with a credit-limit warning', async () => {
  let verified = false;
  server.use(
    me({ 'sales_order.read': 'own', 'sales_order.verify': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1', () =>
      HttpResponse.json(
        verified
          ? baseOrder({
              phase: 'ready_for_stock_check',
              warnings: [{ code: 'credit_limit_exceeded', message: 'Credit limit exceeded by ₹9,800.00' }],
            })
          : baseOrder(),
      )),
    http.post('http://localhost:8000/api/v1/sales-orders/o1/verify', () => {
      verified = true;
      return HttpResponse.json(
        baseOrder({
          phase: 'ready_for_stock_check',
          warnings: [{ code: 'credit_limit_exceeded', message: 'Credit limit exceeded by ₹9,800.00' }],
        }),
      );
    }),
  );

  const { findByText, findAllByText, queryByText } = await render(
    <Providers>
      <OrderDetailScreen />
    </Providers>,
  );

  expect(await findByText('POS-26-27-000041')).toBeTruthy();
  expect(await findByText('DRAFT')).toBeTruthy();
  // The header's net and the (single) line's line_total both read ₹99,800.00
  // in this fixture — at least one of them is enough to confirm the money
  // formatting rendered correctly.
  expect((await findAllByText('₹99,800.00')).length).toBeGreaterThan(0);

  // Tax breakdown collapsed by default — the row (any tax figure) isn't rendered yet.
  expect(await findByText('VIEW TAX BREAKDOWN')).toBeTruthy();
  expect(queryByText('Taxable')).toBeNull();

  const verifyButton = await findByText('SEND TO STOCK CHECK');
  await fireEvent.press(verifyButton);
  expect(await findByText('Items will freeze once verified')).toBeTruthy();

  const confirmButton = await findByText('CONFIRM');
  await fireEvent.press(confirmButton);

  await waitFor(() => expect(verified).toBe(true));
  expect(await findByText('Credit limit exceeded by ₹9,800.00')).toBeTruthy();
});

test('partially_reserved order: delivery notes and payments sections list DN-…/PAY-… rows', async () => {
  server.use(
    me({ 'sales_order.read': 'own', 'delivery_note.create': 'own', 'payment.create': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1', () =>
      HttpResponse.json(
        baseOrder({
          phase: 'partially_reserved',
          reservation_status: 'partially_reserved',
          lines: [
            {
              id: 'l1',
              line_no: 1,
              variant_id: 'v1',
              product_id: 'p1',
              sku: 'SKU-1',
              product_name: 'Shirt',
              variant_label: 'M / Blue',
              hsn_code: '6109',
              uom: 'PCS',
              qty: '40',
              rate: '2495.00',
              discount_pct: '0',
              discount_amount: '0.00',
              order_discount_amount: '0.00',
              taxable_amount: '99800.00',
              tax_rate: '0',
              tax_amount: '0.00',
              line_total: '99800.00',
              reserved_qty: '20',
              delivered_qty: '0',
              invoiced_qty: '0',
              invoiceable_qty: '0',
              remaining_qty: '20',
              deliverable: '20',
              remarks: null,
            },
          ],
          delivery_notes: [
            {
              id: 'dn1',
              number: 'DN-26-27-000007',
              dn_date: '2026-08-15',
              status: 'submitted',
              warehouse_id: 'w1',
              line_count: 1,
              qty_total: '20',
              net: '49900.00',
              delivered_at: null,
              delivered_on: null,
              created_at: '2026-08-15T10:00:00Z',
            },
          ],
          payments: [
            {
              id: 'pay1',
              number: 'PAY-26-27-000003',
              status: 'submitted',
              payment_date: '2026-08-16',
              amount: '20000.00',
              payment_mode_name: 'Bank transfer',
              allocated_to_this_order: '20000.00',
            },
          ],
        }),
      )),
  );

  const { findByText } = await render(
    <Providers>
      <OrderDetailScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  expect(await findByText('PAY-26-27-000003')).toBeTruthy();
  expect(await findByText('RECORD DELIVERY')).toBeTruthy();
});

test('without delivery_note.create, RECORD DELIVERY does not appear even with deliverable qty', async () => {
  server.use(
    me({ 'sales_order.read': 'own' }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1', () =>
      HttpResponse.json(
        baseOrder({
          phase: 'partially_reserved',
          lines: [
            {
              id: 'l1',
              line_no: 1,
              variant_id: 'v1',
              product_id: 'p1',
              sku: 'SKU-1',
              product_name: 'Shirt',
              variant_label: 'M / Blue',
              hsn_code: '6109',
              uom: 'PCS',
              qty: '40',
              rate: '2495.00',
              discount_pct: '0',
              discount_amount: '0.00',
              order_discount_amount: '0.00',
              taxable_amount: '99800.00',
              tax_rate: '0',
              tax_amount: '0.00',
              line_total: '99800.00',
              reserved_qty: '20',
              delivered_qty: '0',
              invoiced_qty: '0',
              invoiceable_qty: '0',
              remaining_qty: '20',
              deliverable: '20',
              remarks: null,
            },
          ],
        }),
      )),
  );

  const { findByText, queryByText } = await render(
    <Providers>
      <OrderDetailScreen />
    </Providers>,
  );

  expect(await findByText('POS-26-27-000041')).toBeTruthy();
  expect(queryByText('RECORD DELIVERY')).toBeNull();
});
