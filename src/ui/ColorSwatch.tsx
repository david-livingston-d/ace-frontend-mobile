import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { radius } from './tokens/radius';
import { CONTROL, hit } from './tokens/layout';
import { selectionHalo, shadow } from './tokens/elevation';
import { productColors } from './tokens/colors';
import { space } from './tokens/spacing';

export type ColorSwatchProps = {
  /** The attribute value's own hex, when the API gives one. */
  color?: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

/** A recognised colour name maps to the product palette; anything else has no
 * fill and falls back to a label chip, which is honest rather than inventing a
 * colour the product isn't. */
export function swatchFill(color: string | undefined, label: string): string | undefined {
  if (color) return color;
  return productColors[label.trim().toLowerCase()];
}

/**
 * A product colour: a 34 px disc with a hairline ring, wearing a jet halo when
 * chosen (`.sw` / `.sw.on`). With no colour to show it degrades to a labelled
 * pill — the axis still works, it just isn't pretending to be a colour.
 */
export function ColorSwatch({ color, label, selected, onPress, disabled }: ColorSwatchProps) {
  const theme = useTheme();
  const fill = swatchFill(color, label);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hit.swatch}
      style={disabled ? styles.disabled : undefined}
    >
      {fill ? (
        <View
          style={[
            styles.swatch,
            { backgroundColor: fill, borderRadius: radius.pill },
            selected
              ? selectionHalo(theme.colors.page, theme.colors.jet)
              : shadow('swatch', theme.mode),
          ]}
        />
      ) : (
        <View
          style={[
            styles.pill,
            {
              backgroundColor: selected ? theme.colors.jet : theme.colors.card,
              borderRadius: radius.pill,
            },
            selected ? shadow('chipOn', theme.mode) : shadow('chip', theme.mode, { color: theme.colors.ringSoft }),
          ]}
        >
          <Text variant="chip" color={selected ? theme.colors.onJet : theme.colors.text}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swatch: { width: CONTROL.swatch, height: CONTROL.swatch },
  pill: { minHeight: CONTROL.swatch, paddingHorizontal: space[3], justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
