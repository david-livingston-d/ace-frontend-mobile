import React from 'react';
import { Text as RNText } from 'react-native';
import { render } from '@testing-library/react-native';
import { useBottomClearance, type BottomClearanceOptions } from '@/ui/useBottomClearance';
import { TAB_BAR_FLOAT, TAB_BAR_HEIGHT } from '@/ui/tokens/layout';
import { space } from '@/ui/tokens/spacing';

// The library's own jest mock reports zero insets, and the whole point of this
// hook is what a *real* device reports — a gesture-nav Pixel_9's 34px bottom
// inset versus a phone with none. `mockInsets` is reassigned per case (the
// `mock` prefix is what lets jest's hoisted factory close over it).
let mockInsets = { top: 24, right: 0, bottom: 0, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => mockInsets,
}));

function Probe({ options }: { options?: BottomClearanceOptions }) {
  const clearance = useBottomClearance(options);
  return <RNText>{`clearance:${clearance}`}</RNText>;
}

const GUTTER = space[4]; // 16
const TAB_BAR = TAB_BAR_HEIGHT + TAB_BAR_FLOAT; // 76

const CASES: { bottom: number; options?: BottomClearanceOptions; expected: number }[] = [
  { bottom: 0, options: undefined, expected: GUTTER },
  { bottom: 0, options: {}, expected: GUTTER },
  { bottom: 0, options: { tabBar: true }, expected: TAB_BAR + GUTTER },
  { bottom: 0, options: { extra: 80 }, expected: 80 + GUTTER },
  { bottom: 0, options: { tabBar: true, extra: 80 }, expected: TAB_BAR + 80 + GUTTER },
  { bottom: 34, options: undefined, expected: 34 + GUTTER },
  { bottom: 34, options: { tabBar: false }, expected: 34 + GUTTER },
  { bottom: 34, options: { tabBar: true }, expected: 34 + TAB_BAR + GUTTER },
  { bottom: 34, options: { extra: 80 }, expected: 34 + 80 + GUTTER },
  { bottom: 34, options: { tabBar: true, extra: 80 }, expected: 34 + TAB_BAR + 80 + GUTTER },
];

test.each(CASES)(
  'bottom inset $bottom with $options clears $expected',
  async ({ bottom, options, expected }) => {
    mockInsets = { top: 24, right: 0, bottom, left: 0 };
    const utils = await render(<Probe options={options} />);
    expect(utils.getByText(`clearance:${expected}`)).toBeTruthy();
  },
);
