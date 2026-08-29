import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { controlRadius } from './tokens/radius';
import type { StatusTone } from './tokens/colors';

export type StatusChipProps = {
  tone: StatusTone;
  label: string;
  size?: 'sm' | 'md';
};

/**
 * The status badge (`redesign.css` §12 `.bdg`): a tinted 9/600 uppercase tag,
 * radius 12, padding 5 x 10. Flat by design — it is a label on a card, not a
 * control, so it takes no shadow.
 */
export function StatusChip({ tone, label, size = 'md' }: StatusChipProps) {
  const theme = useTheme();
  const pair = theme.colors.tone[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: pair.bg,
          paddingHorizontal: size === 'sm' ? space[2] : space[3] - 2,
          paddingVertical: size === 'sm' ? space[1] - 1 : space[1] + 1,
        },
      ]}
    >
      <Text variant="badge" color={pair.fg}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1] + 1,
    borderRadius: controlRadius.badge,
  },
});
