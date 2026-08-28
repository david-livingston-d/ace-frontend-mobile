import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { InvoiceLines, invoiceTaxLabel } from '@/features/invoices/components/InvoiceLines';
import { Providers } from '@/providers';
import { invoiceDetail } from '@/test/fixtures';

// Which GST split an invoice carries is the *document's* own `supply_type`
// ('intra' | 'inter', decided server-side from the seller's state code against
// the place of supply). Never inferred from which half of the split is
// non-zero: that reading turns a zero-rated inter-state invoice into an
// intra-state one, and it does it with a `Number()` on a money string, which
// the money rules forbid outright.

/** An inter-state invoice: the same figures moved onto the IGST half. */
const inter = (over: Parameters<typeof invoiceDetail>[0] = {}) => {
  const base = invoiceDetail();
  return invoiceDetail({
    supply_type: 'inter',
    cgst: '0.00',
    sgst: '0.00',
    igst: '998.00',
    lines: base.lines.map((l) => ({
      ...l,
      cgst_rate: '0',
      cgst_amount: '0.00',
      sgst_rate: '0',
      sgst_amount: '0.00',
      igst_rate: '5',
      igst_amount: '998.00',
    })),
    ...over,
  });
};

test('an inter-state invoice is labelled IGST at the rate its own lines carry', () => {
  expect(invoiceTaxLabel(inter())).toBe('IGST 5%');
});

test('an intra-state invoice is labelled CGST + SGST', () => {
  expect(invoiceTaxLabel(invoiceDetail({ supply_type: 'intra' }))).toBe('CGST 2.5% + SGST 2.5%');
});

test('a zero-rated inter-state invoice is still IGST, not CGST+SGST', () => {
  // The case the old `Number(igst) > 0` inference got wrong: nothing is
  // charged, so every money field is '0.00' — but the supply is still
  // inter-state, and an exempt line has no rate to name at all.
  const zeroRated = inter({
    igst: '0.00',
    tax: '0.00',
    lines: inter().lines.map((l) => ({ ...l, igst_rate: '5', igst_amount: '0.00' })),
  });
  expect(invoiceTaxLabel(zeroRated)).toBe('IGST 5%');
});

test('the tax breakdown shows the IGST row for an inter-state invoice', async () => {
  const { getByText, queryByText } = await render(
    <Providers>
      <InvoiceLines invoice={inter()} />
    </Providers>,
  );

  await fireEvent.press(getByText('View tax breakdown'));

  expect(getByText('IGST')).toBeTruthy();
  // The other half is always zero on an inter-state invoice, and a row of
  // zeroes reads as a charge that was waived rather than one that never
  // applied.
  expect(queryByText('CGST')).toBeNull();
  expect(queryByText('SGST')).toBeNull();
});

test('the tax breakdown shows CGST and SGST for an intra-state invoice', async () => {
  const { getByText, queryByText } = await render(
    <Providers>
      <InvoiceLines invoice={invoiceDetail({ supply_type: 'intra' })} />
    </Providers>,
  );

  await fireEvent.press(getByText('View tax breakdown'));

  expect(getByText('CGST')).toBeTruthy();
  expect(getByText('SGST')).toBeTruthy();
  expect(queryByText('IGST')).toBeNull();
});
