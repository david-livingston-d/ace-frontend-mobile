import React from 'react';
import { StatusBar, Text as RNText } from 'react-native';
import { render } from '@testing-library/react-native';
import { HeroScreen } from '@/ui/HeroScreen';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { usePrefs } from '@/store/prefs';

// M4-T6 fix 1: the hero pages (login, force update) are glossy black in *both*
// themes, so their status-bar icons have to be light in both — in light mode
// `ThemeProvider`'s dark-content icons sat invisible on the hero surface.
//
// `StatusBar` renders nothing, so there is no element to query: what it does is
// push an entry onto RN's global props stack, and the winning value is the last
// entry that names one (`mergePropsStack`). That stack is what these assert on.
type Entry = { barStyle: { value: string } | null; translucent?: boolean };
const stack = () => (StatusBar as unknown as { _propsStack: Entry[] })._propsStack;
const currentBarStyle = () => [...stack()].reverse().find((e) => e.barStyle != null)?.barStyle?.value;

test('the light theme alone puts dark icons on the bar', async () => {
  usePrefs.getState().setTheme('light');
  await render(<ThemeProvider><RNText>home</RNText></ThemeProvider>);
  expect(currentBarStyle()).toBe('dark-content');
});

test('a hero page forces light status-bar icons even in the light theme', async () => {
  usePrefs.getState().setTheme('light');
  await render(
    <ThemeProvider>
      <HeroScreen><RNText>hero</RNText></HeroScreen>
    </ThemeProvider>,
  );
  expect(currentBarStyle()).toBe('light-content');
  // Only `barStyle` is pushed — the provider's `translucent` (edge-to-edge)
  // must keep winning, which it does because the hero entry never names it.
  expect(stack()[stack().length - 1]?.translucent).toBeUndefined();
});

test('leaving the hero page gives the theme its own bar style back', async () => {
  usePrefs.getState().setTheme('light');
  const screen = await render(
    <ThemeProvider>
      <HeroScreen><RNText>hero</RNText></HeroScreen>
    </ThemeProvider>,
  );
  expect(currentBarStyle()).toBe('light-content');
  await screen.rerender(<ThemeProvider><RNText>home</RNText></ThemeProvider>);
  expect(currentBarStyle()).toBe('dark-content');
});
