import React, { createContext, useMemo } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { dark, light, type Colors } from './tokens/colors';
import { typography } from './tokens/typography';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { usePrefs } from '@/store/prefs';

export type Theme = { colors: Colors; type: typeof typography; space: typeof space; radius: typeof radius; mode: 'light' | 'dark' };
export const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = usePrefs((s) => s.theme);
  const mode: 'light' | 'dark' = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const value = useMemo<Theme>(() => ({ colors: mode === 'dark' ? dark : light, type: typography, space, radius, mode }), [mode]);
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={value.colors.bg} />
      {children}
    </ThemeContext.Provider>
  );
}
