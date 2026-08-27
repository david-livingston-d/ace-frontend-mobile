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
      {/* Edge-to-edge (enforced from Android 15 / targetSdk 36): the window
          already draws behind the status bar, so `backgroundColor` is a no-op
          that only ever misled — `translucent` says so explicitly and the bar
          keeps the transparent colour set in `values/styles.xml`. Only the
          icon colour is still ours to choose, and it follows the *app's*
          theme, which the user can set independently of the system's. */}
      <StatusBar translucent barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
}
