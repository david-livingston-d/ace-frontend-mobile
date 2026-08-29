import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { radius } from './tokens/radius';
import { CONTROL, hit } from './tokens/layout';
import { shadow } from './tokens/elevation';
import { space } from './tokens/spacing';

export type SizeChipProps = {
  label: string;
  selected: boolean;
  /** The *variant* is inactive — there is nothing to order. Low stock is not
   * sold out: a shortage is raised for Production and the order still goes
   * through (PRD §Partial processing), so it stays enabled. */
  soldOut?: boolean;
  onPress: () => void;
};

/** A size on the variant picker (`.szc`): a 40 px pill that inverts when
 * chosen and is struck through — but still visible — when sold out. */
export function SizeChip({ label, selected, soldOut, onPress }: SizeChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!soldOut }}
      disabled={soldOut}
      onPress={onPress}
      hitSlop={hit.sizeChip}
      style={[
        styles.chip,
        {
          backgroundColor: soldOut ? theme.colors.sunken : selected ? theme.colors.jet : theme.colors.card,
          borderRadius: radius.pill,
        },
        soldOut
          ? shadow('none', theme.mode, { color: theme.colors.ringSoft })
          : selected
            ? shadow('chipOn', theme.mode)
            : shadow('chip', theme.mode, { color: theme.colors.ringSoft }),
      ]}
    >
      <Text
        variant="rowStrong"
        color={soldOut ? theme.colors.muted : selected ? theme.colors.onJet : theme.colors.text}
        style={soldOut ? styles.struck : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: CONTROL.sizeChipMinWidth,
    height: CONTROL.sizeChip,
    paddingHorizontal: space[4] - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  struck: { textDecorationLine: 'line-through' },
});
