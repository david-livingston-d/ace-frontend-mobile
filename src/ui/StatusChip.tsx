import React from 'react';
import { View } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import type { StatusTone } from './tokens/colors';

export type StatusChipProps = {
  tone: StatusTone;
  label: string;
  size?: 'sm' | 'md';
};

export function StatusChip({ tone, label, size = 'md' }: StatusChipProps) {
  const theme = useTheme();
  const pair = theme.colors.tone[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: pair.bg,
        borderRadius: radius.pill,
        paddingHorizontal: size === 'sm' ? space[2] : space[3],
        paddingVertical: size === 'sm' ? 2 : space[1],
      }}
    >
      <Text variant="label" color={pair.fg}>{label}</Text>
    </View>
  );
}
