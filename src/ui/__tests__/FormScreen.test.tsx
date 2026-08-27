import React from 'react';
import { Keyboard, Platform, StyleSheet, Text as RNText } from 'react-native';
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

// --- Android: the app carries the keyboard itself -------------------------
//
// Android 15 enforces edge-to-edge for `targetSdk` 35+ and stops resizing the
// window for the IME, so `windowSoftInputMode="adjustResize"` no longer lifts
// anything and the pinned footer would sit behind the keyboard (measured on a
// Pixel_9 emulator, M4-T3). `FormScreen` therefore listens for the keyboard
// and pays for it: the footer rises by the keyboard height less the inset it
// already covers, and the scroll content reserves the whole keyboard on top of
// the footer so the last field can still be scrolled clear of both.

type KeyboardHandlers = {
  keyboardDidShow?: (e: { endCoordinates: { height: number } }) => void;
  keyboardDidHide?: () => void;
};

function captureKeyboardHandlers(): KeyboardHandlers {
  const handlers: KeyboardHandlers = {};
  jest
    .spyOn(Keyboard, 'addListener')
    .mockImplementation((event: string, handler: any) => {
      handlers[event as keyof KeyboardHandlers] = handler;
      return { remove: jest.fn() } as never;
    });
  return handlers;
}

describe('on Android, where the window is not resized for the keyboard', () => {
  const realOS = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'android';
  });

  afterEach(() => {
    Platform.OS = realOS;
    jest.restoreAllMocks();
  });

  async function renderWithKeyboard() {
    const handlers = captureKeyboardHandlers();
    const utils = await render(<Harness />);
    await act(async () => {
      fireEvent(utils.getByTestId('form-footer'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 80 } },
      });
    });
    return { utils, handlers };
  }

  test('the footer rises above the keyboard and the scroll reserves it', async () => {
    const { utils, handlers } = await renderWithKeyboard();

    await act(async () => {
      handlers.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });

    // The rect Android reports stops at the navigation bar, so a 300 keyboard
    // has its top edge 300 + 34 above the bottom of the screen; the footer's
    // own 34 + 12 of bottom padding is what it may keep under there, leaving
    // exactly `space[3]` of gap when it rises by the reported height. Measured
    // on device — see `FormScreen`'s own comment for the numbers.
    const footer = StyleSheet.flatten(utils.getByTestId('form-footer').props.style);
    expect(footer.marginBottom).toBe(300);

    // inset + measured footer + the whole keyboard + one gutter.
    const scroll = StyleSheet.flatten(utils.getByTestId('form-scroll').props.contentContainerStyle);
    expect(scroll.paddingBottom).toBe(34 + 80 + 300 + space[4]);
  });

  test('dismissing the keyboard puts the footer back on the safe area', async () => {
    const { utils, handlers } = await renderWithKeyboard();

    await act(async () => {
      handlers.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });
    await act(async () => {
      handlers.keyboardDidHide?.();
    });

    const footer = StyleSheet.flatten(utils.getByTestId('form-footer').props.style);
    expect(footer.marginBottom).toBe(0);
    const scroll = StyleSheet.flatten(utils.getByTestId('form-scroll').props.contentContainerStyle);
    expect(scroll.paddingBottom).toBe(34 + 80 + space[4]);
  });

  test('taps still reach a second field while the keyboard is up', async () => {
    const { utils } = await renderWithKeyboard();
    expect(utils.getByTestId('form-scroll').props.keyboardShouldPersistTaps).toBe('handled');
  });
});

test('iOS leaves the keyboard to KeyboardAvoidingView, subscribing to nothing', async () => {
  const addListener = jest.spyOn(Keyboard, 'addListener');
  const utils = await render(<Harness />);

  expect(addListener).not.toHaveBeenCalledWith('keyboardDidShow', expect.anything());
  expect(StyleSheet.flatten(utils.getByTestId('form-footer').props.style).marginBottom).toBe(0);
  addListener.mockRestore();
});
