import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import type { StatusTone } from './tokens/colors';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: StatusTone;
};

export function Chip({ label, selected, onPress, tone }: ChipProps) {
  const theme = useTheme();
  const toneColors = tone ? theme.colors.tone[tone] : null;
  const bg = selected ? theme.colors.inverseBg : (toneColors ? toneColors.bg : theme.colors.surfaceSunken);
  const fg = selected ? theme.colors.inverseText : (toneColors ? toneColors.fg : theme.colors.text);

  const body = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bg,
          borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text variant="caption" color={fg}>{label}</Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
});
