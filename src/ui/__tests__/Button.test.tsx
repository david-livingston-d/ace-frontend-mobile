import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '@/ui/Button';
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
