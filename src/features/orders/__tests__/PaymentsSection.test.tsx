import React from 'react';
import { render } from '@testing-library/react-native';
import { PaymentsSection } from '@/features/orders/components/PaymentsSection';
import { Providers } from '@/providers';
import { light } from '@/ui/tokens/colors';
import { orderDetail } from '@/test/fixtures';
import type { Schemas } from '@/lib/api/types';

// M4-T6 fix 1: "Paid ₹0.00" was tinted success — a green nothing. The chip
// earns its tone the same way the outstanding one does: only when the figure
// it carries is non-zero.

const summary = (over: Partial<Schemas['SalesOrderSummaryOut']> = {}) => ({
  ...orderDetail().summary,
  ...over,
});

/** The colour a `StatusChip`'s label renders in — its tone, in other words
 * (`Text` composes `[typography, { color }, …]`). */
function chipColor(node: { props: Record<string, unknown> }) {
  return (node.props.style as { color?: string }[]).find((s) => s && s.color)?.color;
}

test('nothing collected yet reads neutral, not success', async () => {
  const { getByText } = await render(
    <Providers>
      <PaymentsSection summary={summary({ paid_amount: '0.00' })} payments={[]} onOpenPayment={jest.fn()} />
    </Providers>,
  );
  expect(chipColor(getByText('PAID ₹0.00'))).toBe(light.tone.neutral.fg);
});

test('money actually received reads success', async () => {
  const { getByText } = await render(
    <Providers>
      <PaymentsSection
        summary={summary({ paid_amount: '1678.95', receivable: '3208.75' })}
        payments={[]}
        onOpenPayment={jest.fn()}
      />
    </Providers>,
  );
  expect(chipColor(getByText('PAID ₹1,678.95'))).toBe(light.tone.success.fg);
  // The outstanding chip's own rule is unchanged — danger while money is owed.
  expect(chipColor(getByText('OUTST. ₹3,208.75'))).toBe(light.tone.danger.fg);
});
