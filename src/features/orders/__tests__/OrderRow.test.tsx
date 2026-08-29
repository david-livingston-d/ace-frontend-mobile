import React from 'react';
import { render } from '@testing-library/react-native';
import { OrderRow } from '@/features/orders/components/OrderRow';
import { Providers } from '@/providers';
import type { SalesOrderListItem } from '@/lib/api/types';

// A list row is the app's densest surface — M4-T6 turns it into a `RowCard`
// carrying the four quantities the PRD says an order is never without
// (ordered / reserved / to deliver / to collect), so those are asserted as
// structure rather than left to a screenshot.
function item(over: Partial<SalesOrderListItem> = {}): SalesOrderListItem {
  return {
    id: 'o1',
    number: 'POS-26-27-000041',
    customer_id: 'c1',
    customer_name: 'Arjun Mehta',
    sales_user_id: 'u1',
    sales_user_name: 'Karthik S',
    order_date: '2026-08-12',
    expected_delivery_date: '2026-08-18',
    net: '2495.00',
    ordered_qty: '5',
    reserved_qty: '2',
    delivered_qty: '1',
    invoiced_qty: '0',
    paid_amount: '0.00',
    outstanding: '2495.00',
    phase: 'draft',
    reservation_status: 'partially_reserved',
    delivery_status: 'not_delivered',
    invoice_status: 'not_invoiced',
    payment_status: 'unpaid',
    has_open_shortage: false,
    ...over,
  };
}

test('a row carries the metrics strip: qty, reserved, to deliver, to collect', async () => {
  const screen = await render(
    <Providers>
      <OrderRow order={item()} />
    </Providers>,
  );

  // `MetricsStrip` labels are the uppercase `label` role.
  expect(screen.getByText('QTY')).toBeTruthy();
  expect(screen.getByText('RESERVED')).toBeTruthy();
  expect(screen.getByText('TO DELIVER')).toBeTruthy();
  expect(screen.getByText('TO COLLECT')).toBeTruthy();

  expect(screen.getByText('5')).toBeTruthy();          // ordered_qty
  expect(screen.getByText('2')).toBeTruthy();          // reserved_qty
  expect(screen.getByText('4')).toBeTruthy();          // ordered - delivered
  expect(screen.getByText('₹2,495.00')).toBeTruthy();  // outstanding
});

test('a committed date reads as a due caption', async () => {
  const screen = await render(
    <Providers>
      <OrderRow order={item()} />
    </Providers>,
  );
  expect(screen.getByText('Due 18 Aug 2026')).toBeTruthy();
});

test('an order with no committed date says so rather than showing nothing', async () => {
  const screen = await render(
    <Providers>
      <OrderRow order={item({ expected_delivery_date: null })} />
    </Providers>,
  );
  expect(screen.getByText('No date committed')).toBeTruthy();
});

test('the row title carries the order number and its phase badge', async () => {
  const screen = await render(
    <Providers>
      <OrderRow order={item()} />
    </Providers>,
  );
  expect(screen.getByText('POS-26-27-000041')).toBeTruthy();
  expect(screen.getByText('DRAFT')).toBeTruthy();
  expect(screen.getByText('NOT DELIVERED')).toBeTruthy();
  expect(screen.getByText('UNPAID')).toBeTruthy();
});
