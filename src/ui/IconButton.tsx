import React from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { radius } from './tokens/radius';
import { CONTROL, hit } from './tokens/layout';
import { shadow } from './tokens/elevation';

export type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  /** `plain` = a bare glyph inside another control (a field's eye/clear),
   * `circle` = the raised round back button (`.bk`), `surface` = the raised
   * rounded-square action (`.iconbtn`). */
  variant?: 'plain' | 'circle' | 'surface';
  /** Not in the brief's contract; added so Stepper can grey out and block presses on
   * its increase/decrease buttons once they hit min/max. */
  disabled?: boolean;
};

const DIMENSIONS = { sm: 32, md: CONTROL.backButton, lg: CONTROL.iconButton } as const;
const ICON_SIZES = { sm: 16, md: 20, lg: 20 } as const;
/** One slop per size, each padding that size's box out to at least 44 x 44
 * (redesign.css §25). A single shared slop cannot do it: `back`'s 1 px pads 42
 * to 44 but leaves `sm` at 34. */
const HIT_SLOPS = { sm: hit.iconSm, md: hit.back, lg: hit.iconLg } as const;

export function IconButton({ icon: Icon, label, onPress, size = 'md', variant = 'plain', disabled }: IconButtonProps) {
  const theme = useTheme();
  const raised = variant !== 'plain';

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
      // Every one of these draws at or under 44 px; the hit box never draws
      // under it — the slop is per *size* (redesign.css §25).
      hitSlop={HIT_SLOPS[size]}
      style={({ pressed }) => [
        styles.base,
        {
          width: DIMENSIONS[size],
          height: DIMENSIONS[size],
          borderRadius: variant === 'surface' ? radius.md : radius.pill,
          backgroundColor: raised
            ? pressed
              ? theme.colors.sunken
              : theme.colors.card
            : pressed && !disabled
              ? theme.colors.ghostHover
              : 'transparent',
        },
        raised ? shadow('outline', theme.mode, { color: theme.colors.ring }) : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <Icon size={ICON_SIZES[size]} color={disabled ? theme.colors.disabledFg : theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
