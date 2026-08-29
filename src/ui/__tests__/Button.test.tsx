import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button } from '@/ui/Button';
import { typography } from '@/ui/tokens/typography';
import { ThemeProvider } from '@/ui/ThemeProvider';

// @testing-library/react-native v14's `render`/`fireEvent`/`rerender` are async (built
// on the new `test-renderer` package) — adapted with await; assertion is unchanged.
test('disabled and loading buttons do not fire', async () => {
  const onPress = jest.fn();
  const { getByText, rerender } = await render(<ThemeProvider><Button label="Sign in" onPress={onPress} disabled /></ThemeProvider>);
  await fireEvent.press(getByText('SIGN IN'));
  await rerender(<ThemeProvider><Button label="Sign in" onPress={onPress} loading /></ThemeProvider>);
  await fireEvent.press(getByText('SIGN IN'));
  expect(onPress).not.toHaveBeenCalled();
});

// `disabledBg` is a filled background meant for the solid variant only — a
// disabled ghost button must stay transparent, not turn into a grey block.
test('a disabled ghost button stays transparent, not filled', async () => {
  const { getByRole } = await render(
    <ThemeProvider><Button label="Ghost" onPress={jest.fn()} variant="ghost" disabled /></ThemeProvider>,
  );
  const flatStyle = [getByRole('button').props.style].flat(Infinity) as Array<Record<string, unknown>>;
  const backgrounds = flatStyle.filter((s) => s && typeof s === 'object' && 'backgroundColor' in s).map((s) => s.backgroundColor);
  expect(backgrounds).toEqual(['transparent']);
});

// redesign.css §9 l.636: the small pill carries its own, tighter type
// (10/.16em, not the 11.5/.22em of a full-size button) — that is what lets the
// order bar fit three of them plus the PDF glyph in one row. A `fullWidth` pill
// is sized by its slot, so it spends none of that slot on side padding, and its
// label never wraps.
test('a small full-width pill uses the tighter type, no padding and one line', async () => {
  const { getByText, getByRole } = await render(
    <ThemeProvider><Button label="Record delivery" onPress={jest.fn()} size="sm" fullWidth /></ThemeProvider>,
  );
  const label = getByText('RECORD DELIVERY');
  expect(label.props.numberOfLines).toBe(1);
  expect(StyleSheet.flatten(label.props.style)).toMatchObject(typography.buttonSm);
  expect(StyleSheet.flatten(getByRole('button').props.style).paddingHorizontal).toBe(0);
});

test('a default-size button keeps the full button type', async () => {
  const { getByText } = await render(<ThemeProvider><Button label="Sign in" onPress={jest.fn()} /></ThemeProvider>);
  expect(StyleSheet.flatten(getByText('SIGN IN').props.style)).toMatchObject(typography.button);
});
