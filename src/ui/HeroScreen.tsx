import React, { useMemo } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { ThemeContext, type Theme } from './ThemeProvider';
import { useTheme } from './useTheme';
import { RadialSurface } from './Gradient';
import { heroPalette } from './tokens/colors';

export type HeroScreenProps = { children: React.ReactNode };

/**
 * A whole screen on the hero surface (`.ph.hero-page`) — the login screen and
 * the force-update gate. Glossy black in *both* themes: these are the two
 * screens with no chrome around them, and the mockup makes them the app's
 * signature rather than another grey board.
 *
 * The gradient is painted once here, and everything inside renders against the
 * `heroPalette` — the dark theme with a transparent page — so `Screen`,
 * `Card`, `Input` and `Button` all come out right without a single one of them
 * knowing it is on a hero page. That is why this is a theme override and not a
 * pile of per-component props.
 */
export function HeroScreen({ children }: HeroScreenProps) {
  const base = useTheme();
  const theme = useMemo<Theme>(() => ({ ...base, colors: heroPalette, mode: 'dark' }), [base]);

  return (
    <View style={[styles.page, { backgroundColor: heroPalette.heroStops[2] }]}>
      {/* The hero surface is glossy black in *both* themes, so the status-bar
          icons above it must be light in both (`redesign.css` §23: the whole
          `.ph.hero-page`, `.sb` included, is `--hero-text`). `ThemeProvider`
          picks its bar style from the app mode, which is the right answer
          everywhere else — this pushes a hero entry on top of RN's status-bar
          stack while the page is mounted, and unmounting pops it, so the
          screen behind gets the theme's own bar style back. Only `barStyle` is
          set: the merged stack keeps `translucent` from the provider's entry. */}
      <StatusBar barStyle="light-content" />
      <RadialSurface stops={heroPalette.heroStops} cx="18%" cy="0%" r="150%" />
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1 } });
