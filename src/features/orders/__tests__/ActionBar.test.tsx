import React from 'react';
import { render } from '@testing-library/react-native';
import { ActionBar } from '@/features/orders/components/ActionBar';
import { Providers } from '@/providers';
import { light } from '@/ui/tokens/colors';
import type { Action } from '@/features/orders/actions';

/**
 * The bar's *rendering* half of canvas edit #7 — the row split itself is a
 * table in `actions.table.test.ts`, where it needs no tree at all.
 */
const noop = jest.fn();

const bar = (actions: Action[]) =>
  render(
    <Providers>
      <ActionBar
        actions={actions}
        onEdit={noop}
        onVerify={noop}
        onCancel={noop}
        onRecordDelivery={noop}
        onCreateInvoice={noop}
        onRecordPayment={noop}
        onPdf={noop}
      />
    </Providers>,
  );

/** A button is solid when its capsule is filled with the jet `solidBg`. */
const isSolid = (node: { props: { style?: unknown } }) =>
  [node.props.style].flat(Infinity).some((s) => (s as { backgroundColor?: string })?.backgroundColor === light.solidBg);

test('an order with no actions renders no bar at all', async () => {
  // `ActionBar` returns null, so all that is left is `Providers`' own wrapper:
  // no button, and no chrome bar to pay a border and a shadow for.
  const { queryAllByRole } = await bar([]);
  expect(queryAllByRole('button')).toHaveLength(0);
});

test('the open-order row is Record delivery, Payment, Invoice plus the PDF glyph', async () => {
  const { getByText, getByLabelText } = await bar(['recordDelivery', 'createInvoice', 'recordPayment', 'pdf']);
  // Canvas edit #7: the two outline actions are named by their noun so the row
  // never wraps; the verb survives as the accessibility label.
  expect(getByText('RECORD DELIVERY')).toBeTruthy();
  expect(getByText('PAYMENT')).toBeTruthy();
  expect(getByText('INVOICE')).toBeTruthy();
  expect(getByLabelText('Record payment')).toBeTruthy();
  expect(getByLabelText('Create invoice')).toBeTruthy();
  expect(getByLabelText('Download PDF')).toBeTruthy();
});

test('every label is single-line — a wrapped pill breaks the row height', async () => {
  const { getByText } = await bar(['recordDelivery', 'createInvoice', 'recordPayment', 'pdf']);
  for (const label of ['RECORD DELIVERY', 'PAYMENT', 'INVOICE']) {
    expect(getByText(label).props.numberOfLines).toBe(1);
  }
});

test.each<[string, Action[], string]>([
  ['an open order', ['recordDelivery', 'createInvoice', 'recordPayment', 'pdf'], 'Record delivery'],
  ['a draft', ['edit', 'verify', 'cancel', 'pdf'], 'Send to stock check'],
  ['payment only — no promoting action', ['recordPayment', 'pdf'], 'Record payment'],
  ['edit only', ['edit', 'pdf'], 'Edit'],
])('%s draws exactly one solid button: %s', async (_name, actions, primary) => {
  const { getAllByRole, getByLabelText } = await bar(actions);
  const solids = getAllByRole('button').filter(isSolid);
  expect(solids).toHaveLength(1);
  expect(solids[0]).toBe(getByLabelText(primary));
});

test('a PDF-only order shows the glyph and no text button', async () => {
  const { getAllByRole, getByLabelText, queryByText } = await bar(['pdf']);
  expect(getByLabelText('Download PDF')).toBeTruthy();
  expect(getAllByRole('button')).toHaveLength(1);
  expect(queryByText('PAYMENT')).toBeNull();
});
