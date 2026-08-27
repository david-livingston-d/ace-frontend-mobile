import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { FormScreen } from '@/ui/FormScreen';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { space } from '@/ui/tokens/spacing';

// A gesture-nav Android phone (the Pixel_9 this app is developed against)
// reports a real bottom inset; the library's own jest mock reports zeroes, and
// that inset is half of what this file is about.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 34, left: 0 }),
}));

function Harness() {
  return (
    <ThemeProvider>
      <FormScreen title="New customer" footer={<RNText>Save & select</RNText>}>
        <RNText>Notes</RNText>
      </FormScreen>
    </ThemeProvider>
  );
}

test('the pinned footer is rendered exactly once', async () => {
  const utils = await render(<Harness />);
  expect(utils.getAllByText('Save & select')).toHaveLength(1);
});

test('the measured footer height feeds the scroll clearance', async () => {
  const utils = await render(<Harness />);

  // Before it lays out there is nothing to reserve for it beyond the inset and
  // one gutter — a *fixed* guess is always wrong for something (see `Sheet`).
  const before = StyleSheet.flatten(utils.getByTestId('form-scroll').props.contentContainerStyle);
  expect(before.paddingBottom).toBe(34 + space[4]);

  await act(async () => {
    fireEvent(utils.getByTestId('form-footer'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 80 } },
    });
  });

  const after = StyleSheet.flatten(utils.getByTestId('form-scroll').props.contentContainerStyle);
  expect(after.paddingBottom).toBe(34 + 80 + space[4]);
});

test('the footer floats above the safe-area inset, paying it once', async () => {
  const utils = await render(<Harness />);
  const footer = StyleSheet.flatten(utils.getByTestId('form-footer').props.style);
  expect(footer.paddingBottom).toBe(34 + space[3]);
  expect(footer.position).toBe('absolute');
});

test('taps reach the next field with the keyboard open, and iOS adjusts for it', async () => {
  const utils = await render(<Harness />);
  const scroll = utils.getByTestId('form-scroll');
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
});
