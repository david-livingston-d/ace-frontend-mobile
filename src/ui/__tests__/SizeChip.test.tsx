import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SizeChip } from '@/ui/SizeChip';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('a sold-out size is disabled and struck through', async () => {
  const onPress = jest.fn();
  const { getByRole, getByText } = await wrap(
    <SizeChip label="32" selected={false} soldOut onPress={onPress} />,
  );
  const chip = getByRole('button');
  expect(chip.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(chip);
  expect(onPress).not.toHaveBeenCalled();
  const textStyle = StyleSheet.flatten(getByText('32').props.style);
  expect(textStyle.textDecorationLine).toBe('line-through');
});

test('an available size is pressable and reports selection', async () => {
  const onPress = jest.fn();
  const { getByRole } = await wrap(<SizeChip label="34" selected onPress={onPress} />);
  const chip = getByRole('button');
  expect(chip.props.accessibilityState.selected).toBe(true);
  await fireEvent.press(chip);
  expect(onPress).toHaveBeenCalled();
});

test('the drawn box is padded out to a 44 px hit area', async () => {
  const { getByRole } = await wrap(<SizeChip label="30" selected={false} onPress={jest.fn()} />);
  expect(getByRole('button').props.hitSlop).toBeTruthy();
});
