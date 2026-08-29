// M4-T8: `PaymentRow` is now *one* layout for every list that shows a payment
// (the History register, a customer's payments tab, the order detail's money
// card). The amount lives in the row's trailing slot with the status badge
// under it — never inline in the meta line, which is what used to make a long
// "customer · mode · ₹amount · date" string wrap into a second layout.
import React from 'react';
import { render, within } from '@testing-library/react-native';
import { PaymentRow } from '@/features/payments/components/PaymentRow';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('a submitted payment puts the amount (and its badge) in the trailing slot, not the meta', async () => {
  const screen = await wrap(
    <PaymentRow
      number="PMT-26-27-000012"
      customerName="Arjun Mehta"
      paymentMode="UPI"
      amount="5000.00"
      paymentDate="2026-08-27"
      status="submitted"
    />,
  );

  const trailing = within(screen.getByTestId('row-trailing'));
  expect(trailing.getByText('₹5,000.00')).toBeTruthy();
  expect(trailing.getByText('SUBMITTED')).toBeTruthy();

  // The meta is customer · mode · date only — the amount is not in it.
  expect(screen.getByText('Arjun Mehta · UPI · 27 Aug 2026')).toBeTruthy();
  expect(screen.getByText('PMT-26-27-000012')).toBeTruthy();
});

test('a draft payment uses the same layout — "Draft payment" as the title, amount still trailing', async () => {
  const screen = await wrap(
    <PaymentRow
      number={null}
      customerName="Arjun Mehta"
      paymentMode="Cheque"
      amount="750.00"
      paymentDate="2026-08-27"
      status="draft"
    />,
  );

  expect(screen.getByText('Draft payment')).toBeTruthy();
  const trailing = within(screen.getByTestId('row-trailing'));
  expect(trailing.getByText('₹750.00')).toBeTruthy();
  expect(trailing.getByText('DRAFT')).toBeTruthy();
  expect(screen.getByText('Arjun Mehta · Cheque · 27 Aug 2026')).toBeTruthy();
});

test('a contextual figure (what this payment left unallocated) rides under the amount', async () => {
  const screen = await wrap(
    <PaymentRow
      number="PMT-26-27-000012"
      paymentMode="UPI"
      amount="5000.00"
      paymentDate="2026-08-27"
      trailing="2000.00"
    />,
  );

  const trailing = within(screen.getByTestId('row-trailing'));
  expect(trailing.getByText('₹5,000.00')).toBeTruthy();
  expect(trailing.getByText('₹2,000.00')).toBeTruthy();
  // No customer in this envelope (the order detail's own money card) — the
  // meta is mode · date.
  expect(screen.getByText('UPI · 27 Aug 2026')).toBeTruthy();
});
