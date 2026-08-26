import { useContext } from 'react';
import { DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { ThemeContext, type Theme } from './ThemeProvider';

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
}

/** Maps our design-system Theme onto a React Navigation theme for NavigationContainer. */
export function navigationTheme(theme: Theme): NavigationTheme {
  return {
    dark: theme.mode === 'dark',
    colors: {
      primary: theme.colors.solidBg,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.tone.danger.fg,
    },
    fonts: DefaultTheme.fonts,
  };
}
