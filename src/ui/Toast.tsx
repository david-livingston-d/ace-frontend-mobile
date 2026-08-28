import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { gutter, space } from './tokens/spacing';
import { controlRadius } from './tokens/radius';
import { shadow } from './tokens/elevation';
import { TAB_BAR_FLOAT, TAB_BAR_HEIGHT } from './tokens/layout';

type ToastMessage = { id: number; message: string };

let nextId = 1;
const listeners = new Set<(message: ToastMessage) => void>();
const AUTO_HIDE_MS = 2500;

export const toast = {
  /** message should be short (<= 6 words) per the Ace DS copy rules. */
  show(message: string) {
    const payload: ToastMessage = { id: nextId++, message };
    listeners.forEach((cb) => cb(payload));
  },
};

type TabBarPresence = { present: boolean; setPresent: (value: boolean) => void };

// A toast is absolutely positioned over the *whole window*, outside the
// navigator (see `providers.tsx`), so nothing in the navigation tree can tell
// it that a tab bar is sitting where it wants to be. The presence is therefore
// declared upwards: the provider wraps both the navigator and the host, and
// `TabNavigator` flips it for as long as it is mounted.
const TabBarContext = createContext<TabBarPresence>({ present: false, setPresent: () => {} });

export function ToastTabBarProvider({ children }: { children: React.ReactNode }) {
  const [present, setPresent] = useState(false);
  const value = useMemo<TabBarPresence>(() => ({ present, setPresent }), [present]);
  return <TabBarContext.Provider value={value}>{children}</TabBarContext.Provider>;
}

/** Declares whether a tab bar is on screen right now — every toast then floats
 * above it rather than under it. `visible` is a parameter rather than assumed
 * from mounting: the tab navigator stays mounted underneath every pushed stack
 * screen, and on those the bar is not on screen at all, so a toast lifted over
 * a bar that isn't there would float in mid-air. */
export function useDeclareTabBar(visible: boolean = true) {
  const { setPresent } = useContext(TabBarContext);
  useEffect(() => {
    setPresent(visible);
    return () => setPresent(false);
  }, [setPresent, visible]);
}

export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { present: tabBar } = useContext(TabBarContext);
  const [current, setCurrent] = useState<ToastMessage | null>(null);

  useEffect(() => {
    function handle(message: ToastMessage) {
      setCurrent(message);
    }
    listeners.add(handle);
    return () => {
      listeners.delete(handle);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <View
      testID="toast"
      pointerEvents="none"
      style={[
        styles.container,
        { bottom: insets.bottom + space[6] + (tabBar ? TAB_BAR_HEIGHT + TAB_BAR_FLOAT : 0) },
      ]}
    >
      <View
        style={[
          styles.toast,
          { backgroundColor: theme.colors.toastBg, borderRadius: controlRadius.toast },
          shadow('overlay', theme.mode),
        ]}
      >
        <Text color={theme.colors.toastFg} variant="bodySm">
          {current.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: gutter, right: gutter, alignItems: 'stretch' },
  toast: { paddingHorizontal: space[4], paddingVertical: space[3] },
});
