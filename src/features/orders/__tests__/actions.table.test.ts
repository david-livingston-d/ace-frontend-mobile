import { visibleActions, type Action } from '@/features/orders/actions';

// D4 §4 — the order detail's action bar, as a permission table.
//
// `actions.test.ts` next door checks whole action *lists* for a handful of
// representative callers. This file checks the one rule those lists exist to
// enforce, action by action: an action appears **iff** the caller holds its
// permission code. Nothing here mentions a role — "Sales Executive" and
// "Sales Head" are seed data, not authorisation, and a UI that keyed off them
// would drift the moment an admin re-cut the roles (PRD non-negotiable #4).

type Row = {
  action: Action;
  /** The one permission code that gates this action. */
  code: string;
  /** A phase in which the action is offered at all. */
  phase: string;
  /** What the order's single line still has left to ship. */
  deliverable: string;
};

const TABLE: Row[] = [
  { action: 'edit', code: 'sales_order.update', phase: 'draft', deliverable: '0' },
  { action: 'verify', code: 'sales_order.verify', phase: 'draft', deliverable: '0' },
  { action: 'cancel', code: 'sales_order.cancel', phase: 'draft', deliverable: '0' },
  { action: 'recordDelivery', code: 'delivery_note.create', phase: 'partially_reserved', deliverable: '8' },
  { action: 'recordPayment', code: 'payment.create', phase: 'partially_reserved', deliverable: '0' },
  { action: 'pdf', code: 'sales_order.read', phase: 'draft', deliverable: '0' },
];

/** Every code in the table — so "without" means "holding everything except
 * this one", which is the case that actually proves the gate. */
const ALL_CODES = TABLE.map((r) => r.code);

const can = (codes: string[]) => (code: string) => codes.includes(code);

const order = (phase: string, deliverable: string) => ({
  phase,
  lines: [{ deliverable }],
});

describe.each(TABLE)('$action is gated by $code', ({ action, code, phase, deliverable }) => {
  test(`present when ${code} is held`, () => {
    expect(visibleActions({ ...order(phase, deliverable), can: can(ALL_CODES) })).toContain(action);
  });

  test(`absent when only ${code} is missing`, () => {
    const others = ALL_CODES.filter((c) => c !== code);
    expect(visibleActions({ ...order(phase, deliverable), can: can(others) })).not.toContain(action);
  });

  test(`present with ${code} alone, whatever else is missing`, () => {
    // `pdf` is the only action that survives on its own for every row; the
    // rest still need their own code and nothing more, so a caller holding
    // exactly one code gets exactly the action(s) that code buys.
    const only = visibleActions({ ...order(phase, deliverable), can: can([code]) });
    expect(only).toEqual([action]);
  });
});

test('a caller holding role names rather than permission codes gets nothing', () => {
  // The check that keeps role names out of the UI: these are the seeded role
  // names, and they buy no action at all.
  const byRole = can(['Sales Executive', 'Sales Head', 'Admin', 'superadmin']);
  expect(visibleActions({ ...order('draft', '8'), can: byRole })).toEqual([]);
  expect(visibleActions({ ...order('partially_reserved', '8'), can: byRole })).toEqual([]);
});

test('a phase outside the matrix offers nothing but the PDF', () => {
  const all = can(ALL_CODES);
  expect(visibleActions({ ...order('closed', '8'), can: all })).toEqual(['pdf']);
  expect(visibleActions({ ...order('cancelled', '8'), can: all })).toEqual(['pdf']);
});

test('record delivery also needs something left to deliver, not just the permission', () => {
  expect(
    visibleActions({ ...order('partially_reserved', '0'), can: can(['delivery_note.create']) }),
  ).toEqual([]);
});
