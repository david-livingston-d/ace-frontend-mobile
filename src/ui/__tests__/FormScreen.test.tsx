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

  // The measured 80 already contains the footer's own `insets.bottom` of
  // padding, so the clearance is the footer plus one gutter — the inset is
  // paid once, not once by the footer and again by the scroll view.
  const after = StyleSheet.flatten(utils.getByTestId('form-scroll').props.contentContainerStyle);
  expect(after.paddingBottom).toBe(80 + space[4]);
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

// --- The pinned footer carries the keyboard itself, on both platforms ------
//
// Nothing else moves it. On Android 15 (`targetSdk` 35+) edge-to-edge is
// enforced and the window is no longer resized for the IME, so
// `windowSoftInputMode="adjustResize"` lifts nothing (measured on a Pixel_9
// emulator, M4-T3); on iOS the footer is an absolutely-positioned sibling of
// the scroll view, which no scroll-view keyboard inset — and no
// `KeyboardAvoidingView` around the scroll view — can reach.
//
// How far it rises differs, because the two report different rectangles:
//   Android — the full `endCoordinates.height`, because the IME rect stops at
//     the navigation bar, so the keyboard's top is already `height +
//     insets.bottom` above the bottom of the screen.
//   iOS — `height - insets.bottom`, because the rect runs all the way to the
//     bottom of the screen.
// Either way the submit row lands `space[3]` clear of the keyboard.

type KeyboardHandlers = {
  keyboardDidShow?: (e: { endCoordinates: { height: number } }) => void;
  keyboardDidHide?: () => void;
  keyboardWillShow?: (e: { endCoordinates: { height: number } }) => void;
  keyboardWillHide?: () => void;
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
    // exactly `space[3]` of gap when it rises by the *full* reported height.
    // Measured on device — see `FormScreen`'s own comment for the numbers.
    const footer = StyleSheet.flatten(utils.getByTestId('form-footer').props.style);
    expect(footer.marginBottom).toBe(300);

    // The risen footer's top edge (300 of lift + its measured 80) plus one
    // gutter. The 34 the footer already pays out of that 80 is not charged
    // again — `useBottomClearance` adds the inset, so it comes back out here.
    const scroll = StyleSheet.flatten(utils.getByTestId('form-scroll').props.contentContainerStyle);
    expect(scroll.paddingBottom).toBe(300 + 80 + space[4]);
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
    expect(scroll.paddingBottom).toBe(80 + space[4]);
  });

  test('taps still reach a second field while the keyboard is up', async () => {
    const { utils } = await renderWithKeyboard();
    expect(utils.getByTestId('form-scroll').props.keyboardShouldPersistTaps).toBe('handled');
  });
});

describe('on iOS, where nothing outside the scroll view is keyboard-aware', () => {
  const realOS = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'ios';
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
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 80 } },
      });
    });
    return { utils, handlers };
  }

  test('the footer rises with the keyboard animation, by the height less the inset', async () => {
    const { utils, handlers } = await renderWithKeyboard();

    // `will`, not `did`, for the lift: the footer travels with the keyboard
    // rather than snapping up after it has landed. `did` is subscribed too,
    // but only to correct the scroll once iOS's own keyboard inset — and the
    // scrolling that comes with it — have settled.
    expect(handlers.keyboardWillShow).toBeDefined();
    expect(handlers.keyboardDidShow).toBeDefined();

    await act(async () => {
      handlers.keyboardWillShow?.({ endCoordinates: { height: 336 } });
    });

    // iOS reports the rect to the bottom of the screen, so a 336 keyboard has
    // its top edge 336 above it; the footer's own 34 + 12 of bottom padding
    // sits under that top edge once it has risen 336 - 34, leaving the same
    // `space[3]` of gap Android gets.
    const footer = StyleSheet.flatten(utils.getByTestId('form-footer').props.style);
    expect(footer.marginBottom).toBe(302);
  });

  test('the scroll clearance stays put — the keyboard is already in the scroll inset', async () => {
    const { utils, handlers } = await renderWithKeyboard();
    const scroll = () =>
      StyleSheet.flatten(utils.getByTestId('form-scroll').props.contentContainerStyle).paddingBottom;

    expect(scroll()).toBe(80 + space[4]);
    await act(async () => {
      handlers.keyboardWillShow?.({ endCoordinates: { height: 336 } });
    });

    // `automaticallyAdjustKeyboardInsets` gives the scroll view a content
    // inset of its own for the keyboard; adding it to the padding here as well
    // would pay for it twice.
    expect(scroll()).toBe(80 + space[4]);
  });

  test('dismissing the keyboard puts the footer back on the safe area', async () => {
    const { utils, handlers } = await renderWithKeyboard();

    await act(async () => {
      handlers.keyboardWillShow?.({ endCoordinates: { height: 336 } });
    });
    await act(async () => {
      handlers.keyboardWillHide?.();
    });

    expect(StyleSheet.flatten(utils.getByTestId('form-footer').props.style).marginBottom).toBe(0);
  });
});
