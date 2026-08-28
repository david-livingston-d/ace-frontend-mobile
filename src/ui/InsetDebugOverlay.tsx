import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { usePrefs } from '@/store/prefs';

/**
 * Development-only read-out of the live safe-area insets, toggled from About.
 * It is how "does the tab bar / toast / last list row actually clear the
 * system navigation" is checked against real numbers on a device — gesture
 * navigation and 3-button navigation report very different bottoms.
 *
 * Removed with the rest of the redesign scaffolding in M4-T10; until then it
 * is doubly gated (`__DEV__` and an off-by-default preference) so it can never
 * appear in a release build.
 */
export function InsetDebugOverlay() {
  const enabled = usePrefs((s) => s.debugInsets);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  if (!__DEV__ || !enabled) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        {
          backgroundColor: theme.colors.inverseBg,
          borderRadius: radius.control,
          top: insets.top + space[2],
          left: space[4],
        },
      ]}
    >
      <Text variant="caption" color={theme.colors.inverseText}>
        {`insets  top ${Math.round(insets.top)}  bottom ${Math.round(insets.bottom)}  left ${Math.round(
          insets.left,
        )}  right ${Math.round(insets.right)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', paddingHorizontal: space[2], paddingVertical: space[1] },
});
