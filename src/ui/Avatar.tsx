import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { RadialSurface } from './Gradient';
import { radius } from './tokens/radius';
import { CONTROL } from './tokens/layout';
import { shadow } from './tokens/elevation';

export type AvatarProps = {
  /** The person's name — the initials are derived, never passed in. */
  name: string;
  size?: number;
};

/** Up to two initials: first + last word, so "Ravi Kumar Singh" reads RS. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1]?.[0] ?? '' : '';
  const initials = (first + last).toUpperCase();
  return initials || '?';
}

/** The identity chip: initials on a glossy dark disc (`.avt`). */
export function Avatar({ name, size = CONTROL.avatar }: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radius.pill },
        shadow('avatar', theme.mode),
      ]}
    >
      <RadialSurface stops={theme.colors.avatarStops} radius={size / 2} cx="30%" cy="20%" r="120%" />
      <Text variant={size >= CONTROL.avatarLg ? 'cardTitle' : 'rowStrong'} color={theme.colors.heroText}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 } });
