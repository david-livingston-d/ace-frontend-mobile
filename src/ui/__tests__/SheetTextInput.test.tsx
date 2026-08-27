import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { __bottomSheetInternalMock, __resetBottomSheetInternalMock } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { SheetTextInput } from '@/ui/SheetTextInput';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => __resetBottomSheetInternalMock());

test('registers the field as the sheet keyboard target on focus and clears it on blur', async () => {
  const { getByLabelText } = await wrap(
    <SheetTextInput label="Reason" accessibilityLabel="Reason" value="" onChangeText={jest.fn()} />,
  );
  const field = getByLabelText('Reason');

  expect(__bottomSheetInternalMock.animatedKeyboardState.get().target).toBeUndefined();

  await fireEvent(field, 'focus', { nativeEvent: { target: 42 } });
  expect(__bottomSheetInternalMock.animatedKeyboardState.get().target).toBe(42);

  await fireEvent(field, 'blur', { nativeEvent: { target: 42 } });
  expect(__bottomSheetInternalMock.animatedKeyboardState.get().target).toBeUndefined();
});

test('forwards accessibilityLabel and typing', async () => {
  const onChangeText = jest.fn();
  const { getByLabelText } = await wrap(
    <SheetTextInput label="Reason" accessibilityLabel="Cancel reason" value="" onChangeText={onChangeText} />,
  );
  const field = getByLabelText('Cancel reason');
  await fireEvent.changeText(field, 'Customer asked to cancel');
  expect(onChangeText).toHaveBeenCalledWith('Customer asked to cancel');
});

test('shows the error message', async () => {
  const { getByText } = await wrap(
    <SheetTextInput label="Reason" value="" onChangeText={jest.fn()} error="Too short" />,
  );
  expect(getByText('Too short')).toBeTruthy();
});
