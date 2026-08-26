import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

export type ButtonProps = {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
};

const HEIGHTS = { md: 44, lg: 52 } as const;

export function Button({ label, onPress, variant = 'solid', size = 'md', disabled, loading, icon: Icon, fullWidth }: ButtonProps) {
  const theme = useTheme();
  const isBlocked = !!disabled || !!loading;

  let bg = 'transparent';
  let fg = theme.colors.text;
  let borderColor = 'transparent';
  if (isBlocked) {
    // `disabledBg` is a filled background — only the solid variant has one to
    // begin with. Ghost/outline stay transparent when disabled; only their
    // text (and outline's border) dim to `disabledFg`.
    fg = theme.colors.disabledFg;
    if (variant === 'solid') {
      bg = theme.colors.disabledBg;
    } else if (variant === 'outline') {
      borderColor = theme.colors.disabledFg;
    }
  } else if (variant === 'solid') {
    bg = theme.colors.solidBg;
    fg = theme.colors.solidFg;
  } else if (variant === 'outline') {
    borderColor = theme.colors.borderStrong;
  }

  function handlePress(e: GestureResponderEvent) {
    if (isBlocked) return;
    onPress(e);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: !!loading }}
      disabled={isBlocked}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: radius.control,
          paddingHorizontal: space[4],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          // Press feedback is opacity-only — no scale transform, no new literal colours.
          opacity: pressed && !isBlocked ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} style={styles.icon} />
        ) : Icon ? (
          <Icon size={16} color={fg} style={styles.icon} />
        ) : null}
        <Text variant="label" color={fg}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
});
