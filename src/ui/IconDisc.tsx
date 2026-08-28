import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { radius } from './tokens/radius';
import { CONTROL } from './tokens/layout';
import { shadow } from './tokens/elevation';

export type IconDiscProps = {
  icon: LucideIcon;
  /** 58 = the empty-state disc (`.disc`); 22 = a timeline node (canvas edit
   * #1), which is a card-surfaced disc with a ring rather than a sunken one. */
  size?: number;
  /** Tints the glyph — a timeline node for a payment, a warning empty state. */
  color?: string;
};

/**
 * A round icon well. At 58 it is the sunken disc an empty/error state is built
 * around; at 22 it is the raised node on the order timeline.
 */
export function IconDisc({ icon: Icon, size = CONTROL.iconDisc, color }: IconDiscProps) {
  const theme = useTheme();
  const small = size <= CONTROL.timelineDisc;
  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: small ? theme.colors.card : theme.colors.sunken,
        },
        small
          ? shadow('note', theme.mode, { color: theme.colors.ring })
          : shadow('inset', theme.mode),
      ]}
    >
      <Icon size={small ? 12 : Math.round(size * 0.38)} color={color ?? theme.colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({ disc: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 } });
