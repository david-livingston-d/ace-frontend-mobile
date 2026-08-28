import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { RadialSurface } from './Gradient';
import { radius } from './tokens/radius';
import { space } from './tokens/spacing';
import { shadow } from './tokens/elevation';

export type HeroTileProps = {
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
  testID?: string;
};

/**
 * The one dark tile on a light board — the first KPI on Home. A radial
 * gradient (SVG, since RN has no gradients and the brief allows no new
 * dependency), inverse text, and a raised digit: the big number carries a
 * text shadow so it reads as embossed on the gloss (canvas edit #2).
 */
export function HeroTile({ label, value, hint, onPress, testID }: HeroTileProps) {
  const theme = useTheme();

  const body = (
    <View
      testID={testID}
      style={[
        styles.tile,
        { backgroundColor: theme.colors.heroStops[2], borderRadius: radius.lg },
        shadow('hero', theme.mode),
      ]}
    >
      <RadialSurface stops={theme.colors.heroStops} radius={radius.lg} cx="18%" cy="0%" r="150%" />
      <Text variant="label" color={theme.colors.heroLabel}>{label}</Text>
      <Text
        variant="stat"
        color={theme.colors.heroText}
        // The digit sits *on* the gloss rather than in it (canvas edit #2).
        style={[styles.value, { textShadowColor: theme.colors.heroDigitShadow }]}
      >
        {value}
      </Text>
      {hint ? <Text variant="caption" color={theme.colors.heroLabel}>{hint}</Text> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.press}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { padding: space[3] + 1, alignItems: 'center', gap: space[1], overflow: 'visible' },
  press: { flex: 1 },
  value: { textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8 },
});
