import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TimelineScreen } from '@/features/orders/screens/TimelineScreen';
import { futureNodes } from '@/features/orders/components/TimelineList';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { TIMELINE_FUTURE_OPACITY } from '@/ui/tokens/layout';
import { orderDetail } from '@/test/fixtures';
import type { Schemas } from '@/lib/api/types';

// M4-T6 fix 1: the timeline was missing two specified elements — the frame's
// header card (order number + phase badge) and canvas edit #1's future nodes
// at 45 % opacity. Both are asserted here on the rendered tree.

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'o1' } }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());

const EVENTS: Schemas['TimelineItemOut'][] = [
  { at: '2026-08-12T10:12:00Z', action: 'sales_order.create', user_name: 'Karthik S', summary: 'Order created' },
  { at: '2026-08-12T10:41:00Z', action: 'sales_order.verify', user_name: 'Karthik S', summary: 'Verified — ready for stock check' },
];

function serve(over: Partial<Schemas['SalesOrderDetailOut']> = {}) {
  server.use(
    http.get('http://localhost:8000/api/v1/sales-orders/o1/timeline', () => HttpResponse.json({ items: EVENTS })),
    http.get('http://localhost:8000/api/v1/sales-orders/o1', () => HttpResponse.json(orderDetail(over))),
  );
}

test('the header card names the order and its phase', async () => {
  serve({ phase: 'payment_pending' });
  const { findByText } = await render(<Providers><TimelineScreen /></Providers>);
  expect(await findByText('POS-26-27-000041')).toBeTruthy();
  expect(await findByText('Arjun Mehta')).toBeTruthy();
  expect(await findByText('PAYMENT PENDING')).toBeTruthy();
});

test('an open order shows the road ahead, dimmed to 45 %', async () => {
  // 40 units ordered, ₹99,800 still receivable (the fixture's default).
  serve({ phase: 'fully_delivered' });
  const { findByText, findAllByText } = await render(<Providers><TimelineScreen /></Providers>);

  const closed = await findByText('Order closed');
  expect(await findByText('Payment received')).toBeTruthy();
  // Both remaining nodes carry the same money hint — the payment step and the
  // closure it gates.
  expect(await findAllByText('Pending ₹99,800.00')).toHaveLength(2);
  // The whole node is dimmed, so the opacity sits on the row the text is in.
  expect(StyleSheet.flatten(closed.parent?.parent?.props.style)).toMatchObject({
    opacity: TIMELINE_FUTURE_OPACITY,
  });
});

test('a closed order has no road ahead', async () => {
  serve({ phase: 'closed' });
  const { findByText, queryByText } = await render(<Providers><TimelineScreen /></Providers>);
  await findByText('Order created');
  expect(queryByText('Order closed')).toBeNull();
  expect(queryByText('Payment received')).toBeNull();
});

test('futureNodes: the remaining lifecycle steps, in phase order', () => {
  expect(futureNodes('draft', '0.00').map((n) => n.key)).toEqual([
    'ready_for_stock_check',
    'fully_reserved',
    'fully_delivered',
    'payment_pending',
    'closed',
  ]);
  // Partial states, `ready_to_close` and the alternative endings are never steps.
  expect(futureNodes('partially_delivered', '0.00').map((n) => n.key)).toEqual(['fully_delivered', 'payment_pending', 'closed']);
  expect(futureNodes('cancelled', '0.00')).toEqual([]);
  expect(futureNodes('short_closed', '0.00')).toEqual([]);
  expect(futureNodes('closed', '0.00')).toEqual([]);
});

test('futureNodes: the closing hint is the money still owed, or the rule', () => {
  expect(futureNodes('payment_pending', '3208.75')[0]).toMatchObject({
    key: 'closed',
    label: 'Order closed',
    hint: 'Pending ₹3,208.75',
  });
  expect(futureNodes('payment_pending', '0.00')[0]?.hint).toBe('Requires delivery + payment resolved');
});
