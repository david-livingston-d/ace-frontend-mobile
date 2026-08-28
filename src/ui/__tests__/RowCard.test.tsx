import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RowCard } from '@/ui/RowCard';
import { StatusChip } from '@/ui/StatusChip';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('renders every slot it is given', async () => {
  const { getByText } = await wrap(
    <RowCard
      title="SO-26-27-00035"
      meta="ABC Traders · ₹1,25,000.00"
      badges={<StatusChip tone="warning" label="Partial" />}
      metrics={[
        { label: 'Qty', value: '100' },
        { label: 'To collect', value: '₹40,000.00', tone: 'danger' },
      ]}
      trailing="›"
    />,
  );
  expect(getByText('SO-26-27-00035')).toBeTruthy();
  expect(getByText('ABC Traders · ₹1,25,000.00')).toBeTruthy();
  expect(getByText('PARTIAL')).toBeTruthy();
  expect(getByText('QTY')).toBeTruthy();
  expect(getByText('100')).toBeTruthy();
  expect(getByText('TO COLLECT')).toBeTruthy();
  expect(getByText('₹40,000.00')).toBeTruthy();
  expect(getByText('›')).toBeTruthy();
});

test('presses through when given onPress, and is a plain card otherwise', async () => {
  const onPress = jest.fn();
  const { getByTestId, queryByRole } = await wrap(
    <RowCard title="SO-1" onPress={onPress} testID="row" />,
  );
  await fireEvent.press(getByTestId('row'));
  expect(onPress).toHaveBeenCalled();

  const plain = await wrap(<RowCard title="SO-2" />);
  expect(plain.queryByRole('button')).toBeNull();
  expect(queryByRole('button')).toBeTruthy();
});
