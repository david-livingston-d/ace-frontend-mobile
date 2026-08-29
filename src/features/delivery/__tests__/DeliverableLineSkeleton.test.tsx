// Fix round 1 (finding 3): `RecordDeliveryScreen`'s loading state used to be
// two 110px blocks sized for an earlier, taller line card. This pins the
// replacement's card count so loading and loaded stay the same silhouette.
import React from 'react';
import { render } from '@testing-library/react-native';
import { DeliverableLineSkeleton } from '@/features/delivery/components/DeliverableLineSkeleton';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('renders one card placeholder per line, defaulting to three', async () => {
  const screen = await wrap(<DeliverableLineSkeleton />);
  expect(screen.getAllByTestId('deliverable-skeleton-row')).toHaveLength(3);
});

test('renders exactly N card placeholders for a given count', async () => {
  const screen = await wrap(<DeliverableLineSkeleton count={2} />);
  expect(screen.getAllByTestId('deliverable-skeleton-row')).toHaveLength(2);
});
