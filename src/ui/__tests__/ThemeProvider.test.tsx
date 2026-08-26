import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { useTheme } from '@/ui/useTheme';
import { usePrefs } from '@/store/prefs';
import { dark, light } from '@/ui/tokens/colors';

function Probe() { const t = useTheme(); return <Text testID="bg">{t.colors.bg}</Text>; }

// @testing-library/react-native v14's `render`/`rerender` are async (built on the new
// `test-renderer` package) — adapted with await; assertions are unchanged from the brief.
test('follows the stored preference over the system scheme', async () => {
  usePrefs.getState().setTheme('dark');
  const { getByTestId, rerender } = await render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(getByTestId('bg').props.children).toBe(dark.bg);
  usePrefs.getState().setTheme('light');
  await rerender(<ThemeProvider><Probe /></ThemeProvider>);
  expect(getByTestId('bg').props.children).toBe(light.bg);
});
