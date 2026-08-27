import { visibleActions } from '@/features/orders/actions';

const line = (deliverable: string) => ({ deliverable }) as never;
const perms = (...codes: string[]) => (c: string) => codes.includes(c);

test('draft with update/verify/cancel shows edit, verify, cancel, pdf', () => {
  expect(
    visibleActions({
      phase: 'draft',
      lines: [line('0')],
      can: perms('sales_order.read', 'sales_order.update', 'sales_order.verify', 'sales_order.cancel'),
    }),
  ).toEqual(['edit', 'verify', 'cancel', 'pdf']);
});

test('reserved order with deliverable qty and delivery_note.create shows record delivery + payment', () => {
  expect(
    visibleActions({
      phase: 'partially_reserved',
      lines: [line('8')],
      can: perms('sales_order.read', 'delivery_note.create', 'payment.create'),
    }),
  ).toEqual(['recordDelivery', 'recordPayment', 'pdf']);
});

test('no permission → only pdf; closed order → nothing but pdf', () => {
  expect(
    visibleActions({ phase: 'partially_reserved', lines: [line('8')], can: perms('sales_order.read') }),
  ).toEqual(['pdf']);
  expect(
    visibleActions({
      phase: 'closed',
      lines: [line('8')],
      can: perms('sales_order.read', 'delivery_note.create', 'payment.create'),
    }),
  ).toEqual(['pdf']);
});

test('reserved order without any deliverable qty does not show record delivery', () => {
  expect(
    visibleActions({
      phase: 'partially_reserved',
      lines: [line('0')],
      can: perms('sales_order.read', 'delivery_note.create'),
    }),
  ).toEqual(['pdf']);
});

test('draft without any granted permission still only shows pdf when readable', () => {
  expect(visibleActions({ phase: 'draft', lines: [line('0')], can: perms('sales_order.read') })).toEqual(['pdf']);
});
