import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Sheet, useSheet, type SheetHandle } from '@/ui/Sheet';
import { Providers } from '@/providers';

// `jest.setup.ts` replaces the whole module with the library's own jest mock,
// whose `useSafeAreaInsets` reports zeroes. A gesture-navigation Android phone
// (the Pixel_9 this app is developed against) reports a real bottom inset, and
// that inset is the whole point of this file — so re-mock with one.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 34, left: 0 }),
}));

// D4 §4 — a sheet with a pinned footer used to reserve a *fixed* 48px of
// bottom padding for it. The real footer (a 44px button row plus its own
// padding) is taller than that, and on a gesture-nav phone it also floats
// above a 34px inset — so the last section of the orders filter sheet ("Stock
// shortage", the sales-user chips) and of the payments one ("Allocation")
// scrolled underneath Apply/Reset with no way to reach them. Measure the
// footer instead of guessing at it.

function Harness({ sheetRef }: { sheetRef: React.Ref<SheetHandle> }) {
  return (
    <Sheet
      ref={sheetRef}
      title="Filters"
      scroll
      footer={
        <View>
          <RNText>Apply filters</RNText>
        </View>
      }
    >
      <RNText>Stock shortage</RNText>
    </Sheet>
  );
}

function Wrapper() {
  const { ref } = useSheet();
  React.useEffect(() => {
    ref.current?.open();
  }, [ref]);
  return <Harness sheetRef={ref} />;
}

test('the scroll content clears the measured footer, its inset and a gutter', async () => {
  const utils = await render(
    <Providers>
      <Wrapper />
    </Providers>,
  );

  expect(await utils.findByText('Stock shortage')).toBeTruthy();

  // The footer lays out at its real height — taller than the old fixed 48.
  await act(async () => {
    fireEvent(utils.getByTestId('sheet-footer'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 80 } },
    });
  });

  const content = StyleSheet.flatten(utils.getByTestId('sheet-content').props.contentContainerStyle);
  expect(content.paddingBottom).toBe(80 + 34 + 16);
});

test('the footer is lifted above the safe-area inset rather than sitting under it', async () => {
  const utils = await render(
    <Providers>
      <Wrapper />
    </Providers>,
  );

  expect(await utils.findByText('Apply filters')).toBeTruthy();
  // `BottomSheetFooter` positions itself `bottomInset` above the bottom edge.
  expect(utils.getByTestId('bottom-sheet-footer').props.bottomInset).toBe(34);
  // ...and the row inside it keeps its own gutter over that inset.
  expect(StyleSheet.flatten(utils.getByTestId('sheet-footer').props.style).paddingBottom).toBe(34 + 12);
});
