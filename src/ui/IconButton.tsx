import React from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { radius } from './tokens/radius';

export type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  /** Not in the brief's contract; added so Stepper can grey out and block presses on
   * its increase/decrease buttons once they hit min/max. */
  disabled?: boolean;
};

const DIMENSIONS = { sm: 32, md: 40, lg: 48 } as const;
const ICON_SIZES = { sm: 16, md: 18, lg: 20 } as const;

export function IconButton({ icon: Icon, label, onPress, size = 'md', disabled }: IconButtonProps) {
  const theme = useTheme();

  function handlePress(e: GestureResponderEvent) {
    if (disabled) return;
    onPress(e);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          width: DIMENSIONS[size],
          height: DIMENSIONS[size],
          borderRadius: radius.control,
          backgroundColor: pressed && !disabled ? theme.colors.ghostHover : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Icon size={ICON_SIZES[size]} color={disabled ? theme.colors.disabledFg : theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
