// Fix round 1 (finding 3): `PendingByOrderList` used to show `OrdersSkeleton`
// (two chips + four metrics) while its loaded rows carry one badge, a
// Value/Paid/Outstanding strip and a trailing Pay button — a loading
// silhouette that did not match what replaced it. `PaymentsSkeleton` is now
// shared by both pending lists; this just pins its card count.
import React from 'react';
import { render } from '@testing-library/react-native';
import { PaymentsSkeleton } from '@/features/payments/components/PaymentsSkeleton';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('renders one card placeholder per row, defaulting to four', async () => {
  const screen = await wrap(<PaymentsSkeleton />);
  expect(screen.getAllByTestId('payments-skeleton-row')).toHaveLength(4);
});

test('renders exactly N card placeholders for a given count', async () => {
  const screen = await wrap(<PaymentsSkeleton count={3} metrics />);
  expect(screen.getAllByTestId('payments-skeleton-row')).toHaveLength(3);
});
