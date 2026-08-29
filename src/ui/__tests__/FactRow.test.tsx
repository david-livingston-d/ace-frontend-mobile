import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FactRow } from '@/ui/FactRow';
import { StatusChip } from '@/ui/StatusChip';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (node: React.ReactElement) => render(<ThemeProvider>{node}</ThemeProvider>);

test('renders the label and a string value as one line', async () => {
  const { getByText } = await wrap(<FactRow label="Delivery date" value="27 Aug 2026" />);
  expect(getByText('Delivery date')).toBeTruthy();
  expect(getByText('27 Aug 2026')).toBeTruthy();
});

// The three detail screens each pass a plain string, but the totals card wants
// its own lighter weight and the DN header a chip — so a node passes through
// untouched rather than being coerced into the row's default role.
test('a node value is rendered as given', async () => {
  const { getByText } = await wrap(
    <FactRow label="Status" value={<StatusChip tone="success" label="Delivered" />} />,
  );
  expect(getByText('DELIVERED')).toBeTruthy();
});

test('with onPress the value is a button', async () => {
  const onPress = jest.fn();
  const { getByRole } = await wrap(<FactRow label="Customer" value="Arjun Mehta" onPress={onPress} />);
  await fireEvent.press(getByRole('button'));
  expect(onPress).toHaveBeenCalled();
});

// Without `onPress` there is nothing to press: a fact is not a control, and a
// screen reader should not announce three buttons on a card of three facts.
test('without onPress the value is not a button', async () => {
  const { queryByRole } = await wrap(<FactRow label="Value" value="₹1,25,000.00" />);
  expect(queryByRole('button')).toBeNull();
});
