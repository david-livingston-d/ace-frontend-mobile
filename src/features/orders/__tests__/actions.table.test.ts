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
  /** Codes the action *also* needs, all of them, on top of `code` — an action
   * whose screen immediately calls a second, differently-guarded endpoint. */
  also?: string[];
  /** A phase in which the action is offered at all. */
  phase: string;
  /** What the order's single line still has left to ship. */
  deliverable: string;
  /** What the order's single line has delivered-but-not-yet-invoiced. */
  invoiceable?: string;
  /** Delivery notes on the order, as the detail payload lists them. */
  deliveryNotes?: { status: string }[];
  /** Invoices already raised against it. */
  invoices?: { status: string }[];
};

const TABLE: Row[] = [
  { action: 'edit', code: 'sales_order.update', phase: 'draft', deliverable: '0' },
  { action: 'verify', code: 'sales_order.verify', phase: 'draft', deliverable: '0' },
  { action: 'cancel', code: 'sales_order.cancel', phase: 'draft', deliverable: '0' },
  { action: 'recordDelivery', code: 'delivery_note.create', phase: 'partially_reserved', deliverable: '8' },
  { action: 'recordPayment', code: 'payment.create', phase: 'partially_reserved', deliverable: '0' },
  // Whole-DN invoicing (PRD §21): the action exists because a *delivered*
  // note on this order is not yet claimed by a live invoice. It needs
  // `invoice.read` as well as `invoice.create`: the screen it opens asks
  // `GET …/invoiceable`, which the API guards with `invoice.read`.
  {
    action: 'createInvoice',
    code: 'invoice.create',
    also: ['invoice.read'],
    phase: 'fully_delivered',
    deliverable: '0',
    invoiceable: '8',
    deliveryNotes: [{ status: 'delivered' }],
    invoices: [],
  },
  { action: 'pdf', code: 'sales_order.read', phase: 'draft', deliverable: '0' },
];

/** Every code in the table — so "without" means "holding everything except
 * this one", which is the case that actually proves the gate. */
const ALL_CODES = TABLE.flatMap((r) => [r.code, ...(r.also ?? [])]);

const can = (codes: string[]) => (code: string) => codes.includes(code);

const order = (row: Pick<Row, 'phase' | 'deliverable' | 'invoiceable' | 'deliveryNotes' | 'invoices'>) => ({
  phase: row.phase,
  lines: [{ deliverable: row.deliverable, invoiceable_qty: row.invoiceable ?? '0' }],
  deliveryNotes: row.deliveryNotes ?? [],
  invoices: row.invoices ?? [],
});

describe.each(TABLE)('$action is gated by $code', (row) => {
  const { action, code } = row;

  test(`present when ${code} is held`, () => {
    expect(visibleActions({ ...order(row), can: can(ALL_CODES) })).toContain(action);
  });

  test(`absent when only ${code} is missing`, () => {
    const others = ALL_CODES.filter((c) => c !== code);
    expect(visibleActions({ ...order(row), can: can(others) })).not.toContain(action);
  });

  test(`present with ${code} alone, whatever else is missing`, () => {
    // `pdf` is the only action that survives on its own for every row; the
    // rest still need their own code(s) and nothing more, so a caller holding
    // exactly those gets exactly the action(s) they buy.
    const only = visibleActions({ ...order(row), can: can([code, ...(row.also ?? [])]) });
    expect(only).toEqual([action]);
  });

  // Same proof for each *additional* code the action needs: hold everything
  // except that one, and the action must be gone.
  for (const extra of row.also ?? []) {
    test(`absent when only ${extra} is missing`, () => {
      const others = ALL_CODES.filter((c) => c !== extra);
      expect(visibleActions({ ...order(row), can: can(others) })).not.toContain(action);
    });
  }
});

test('a caller holding role names rather than permission codes gets nothing', () => {
  // The check that keeps role names out of the UI: these are the seeded role
  // names, and they buy no action at all.
  const byRole = can(['Sales Executive', 'Sales Head', 'Admin', 'superadmin']);
  expect(visibleActions({ ...order({ phase: 'draft', deliverable: '8' }), can: byRole })).toEqual([]);
  expect(visibleActions({ ...order({ phase: 'partially_reserved', deliverable: '8' }), can: byRole })).toEqual([]);
});

test('a phase outside the matrix offers nothing but the PDF', () => {
  const all = can(ALL_CODES);
  const closed = { deliverable: '8', invoiceable: '8', deliveryNotes: [{ status: 'delivered' }] };
  expect(visibleActions({ ...order({ ...closed, phase: 'closed' }), can: all })).toEqual(['pdf']);
  expect(visibleActions({ ...order({ ...closed, phase: 'cancelled' }), can: all })).toEqual(['pdf']);
});

test('record delivery also needs something left to deliver, not just the permission', () => {
  expect(
    visibleActions({ ...order({ phase: 'partially_reserved', deliverable: '0' }), can: can(['delivery_note.create']) }),
  ).toEqual([]);
});

// Whole-DN invoicing: what is billable is a *delivered note*, never a
// quantity — so the action needs a delivered note that no live (draft or
// submitted) invoice already claims, not merely the permission.
describe('create invoice needs an unclaimed delivered note, not just the permission', () => {
  const canCreate = can(['invoice.create', 'invoice.read']);
  const delivered = [{ status: 'delivered' }];

  test('no delivery note at all', () => {
    expect(
      visibleActions({ ...order({ phase: 'fully_delivered', deliverable: '0', invoiceable: '0' }), can: canCreate }),
    ).toEqual([]);
  });

  test('a note that has not been delivered yet', () => {
    expect(
      visibleActions({
        ...order({
          phase: 'partially_delivered',
          deliverable: '0',
          invoiceable: '0',
          deliveryNotes: [{ status: 'submitted' }],
        }),
        can: canCreate,
      }),
    ).toEqual([]);
  });

  test('a delivered note already billed by a submitted invoice', () => {
    // A submitted invoice moves `invoiced_qty`, so the order line has nothing
    // invoiceable left.
    expect(
      visibleActions({
        ...order({
          phase: 'fully_delivered',
          deliverable: '0',
          invoiceable: '0',
          deliveryNotes: delivered,
          invoices: [{ status: 'submitted' }],
        }),
        can: canCreate,
      }),
    ).toEqual([]);
  });

  test('a delivered note already claimed by a draft invoice', () => {
    // A draft moves no quantity, so the claim is counted note-for-draft.
    expect(
      visibleActions({
        ...order({
          phase: 'fully_delivered',
          deliverable: '0',
          invoiceable: '8',
          deliveryNotes: delivered,
          invoices: [{ status: 'draft' }],
        }),
        can: canCreate,
      }),
    ).toEqual([]);
  });

  test('a cancelled invoice releases its note again', () => {
    expect(
      visibleActions({
        ...order({
          phase: 'fully_delivered',
          deliverable: '0',
          invoiceable: '8',
          deliveryNotes: delivered,
          invoices: [{ status: 'cancelled' }],
        }),
        can: canCreate,
      }),
    ).toEqual(['createInvoice']);
  });
});

// The create screen opens on `GET …/invoiceable`, which the API guards with
// `invoice.read` — so a grant of one code without the other must not put a
// button on the order that can only ever reach a 403.
describe('create invoice needs both invoice.create and invoice.read', () => {
  const invoiceable = {
    phase: 'fully_delivered',
    deliverable: '0',
    invoiceable: '8',
    deliveryNotes: [{ status: 'delivered' }],
  };

  test('holding both', () => {
    expect(
      visibleActions({ ...order(invoiceable), can: can(['invoice.create', 'invoice.read']) }),
    ).toEqual(['createInvoice']);
  });

  test('holding only invoice.create', () => {
    expect(visibleActions({ ...order(invoiceable), can: can(['invoice.create']) })).toEqual([]);
  });

  test('holding only invoice.read', () => {
    expect(visibleActions({ ...order(invoiceable), can: can(['invoice.read']) })).toEqual([]);
  });
});
