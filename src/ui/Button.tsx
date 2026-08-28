import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { RadialSurface } from './Gradient';
import { space } from './tokens/spacing';
import { controlRadius, radius } from './tokens/radius';
import { CONTROL, hit } from './tokens/layout';
import { shadow } from './tokens/elevation';

export type ButtonProps = {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: 'solid' | 'outline' | 'ghost';
  /** 44 / 48 / 54 — the mockup's `.btnP.sm`, `.btnO`, `.btnP`. */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  /** A destructive primary (solid red fill, tone shadow) — cancel, delete. */
  destructive?: boolean;
};

const HEIGHTS = { sm: CONTROL.buttonSm, md: CONTROL.buttonMd, lg: CONTROL.buttonLg } as const;
const CORNERS = { sm: controlRadius.buttonSm, md: controlRadius.buttonMd, lg: radius.xl } as const;

/**
 * The pill. Primary is a glossy jet capsule that sits *above* the page
 * (`shadow('button')`), outline is a white capsule with a hairline ring and a
 * softer lift, ghost is text only. A press darkens the fill rather than fading
 * it — the button must never look translucent.
 */
export function Button({
  label,
  onPress,
  variant = 'solid',
  size = 'md',
  disabled,
  loading,
  icon: Icon,
  fullWidth,
  destructive,
}: ButtonProps) {
  const theme = useTheme();
  const isBlocked = !!disabled || !!loading;
  const isSolid = variant === 'solid';
  // The glossy fill only exists in light mode: in dark the primary is a flat
  // bright capsule (`--btnp-bg`), which is what reads as "raised" on a dark page.
  const glossy = isSolid && !isBlocked && !destructive && theme.mode === 'light';

  let bg = 'transparent';
  let fg = theme.colors.text;
  if (isBlocked) {
    fg = theme.colors.disabledFg;
    if (isSolid) bg = theme.colors.disabledBg;
  } else if (isSolid) {
    bg = destructive ? theme.colors.dangerSolid : theme.colors.solidBg;
    fg = destructive ? theme.colors.onDanger : theme.colors.solidFg;
  } else if (variant === 'outline') {
    bg = theme.colors.card;
  }

  const depth = isBlocked
    ? isSolid
      ? shadow('inset', theme.mode)
      : shadow('none', theme.mode, { color: theme.colors.ring })
    : isSolid
      ? shadow('button', theme.mode)
      : variant === 'outline'
        ? shadow('outline', theme.mode, { color: theme.colors.ring })
        : shadow('none', theme.mode);

  function handlePress(e: GestureResponderEvent) {
    if (isBlocked) return;
    onPress(e);
  }

  function pressedBg() {
    if (isSolid) return theme.colors.solidPressed;
    if (variant === 'outline') return theme.colors.sunken;
    return theme.colors.ghostHover;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: !!loading }}
      disabled={isBlocked}
      onPress={handlePress}
      hitSlop={size === 'sm' ? hit.segment : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: pressed && !isBlocked ? pressedBg() : bg,
          borderRadius: CORNERS[size],
          paddingHorizontal: space[5],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        depth,
      ]}
    >
      {glossy ? <RadialSurface stops={theme.colors.heroStops} radius={CORNERS[size]} cx="30%" cy="0%" r="200%" /> : null}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} style={styles.icon} />
        ) : Icon ? (
          <Icon size={16} color={fg} style={styles.icon} />
        ) : null}
        <Text variant="button" color={fg}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  content: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: space[2] },
});
