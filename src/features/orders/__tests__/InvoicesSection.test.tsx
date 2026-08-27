import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { InvoicesSection } from '@/features/orders/components/InvoicesSection';
import { Providers } from '@/providers';
import type { InvoiceSummary } from '@/features/orders/types';

const invoice = (over: Partial<InvoiceSummary> = {}): InvoiceSummary => ({
  id: 'i1',
  number: 'INV-26-27-000003',
  status: 'submitted',
  invoice_date: '2026-08-20',
  due_date: '2026-09-20',
  net: '11200.00',
  ...over,
});

test('PAY is offered on submitted invoices only, and hands back the invoice tapped', async () => {
  const onPay = jest.fn();
  const screen = await render(
    <Providers>
      <InvoicesSection
        invoices={[
          invoice({ id: 'draft', number: null, status: 'draft' }),
          invoice({ id: 'cancelled', number: 'INV-26-27-000004', status: 'cancelled' }),
          invoice({ id: 'live', number: 'INV-26-27-000005', status: 'submitted' }),
        ]}
        onDownloadPdf={jest.fn()}
        onPay={onPay}
      />
    </Providers>,
  );

  // A draft owes nothing yet and a cancelled invoice is not payable at all —
  // the server refuses both, so only the live one gets the action.
  expect(screen.getAllByText('PAY')).toHaveLength(1);
  await fireEvent.press(screen.getByText('PAY'));
  expect(onPay).toHaveBeenCalledWith(expect.objectContaining({ id: 'live' }));
});

test('without the permission there is no PAY action at all', async () => {
  const screen = await render(
    <Providers>
      <InvoicesSection invoices={[invoice()]} onDownloadPdf={jest.fn()} />
    </Providers>,
  );
  expect(screen.queryByText('PAY')).toBeNull();
});
