import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from './useTheme';
import { typography, UPPERCASE_ROLES } from './tokens/typography';
import type { Colors } from './tokens/colors';

export type TextVariant = keyof typeof typography;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: keyof Colors | string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
};

function resolveColor(colors: Colors, color?: keyof Colors | string): string | undefined {
  if (!color) return undefined;
  const value = (colors as unknown as Record<string, unknown>)[color as string];
  return typeof value === 'string' ? value : (color as string);
}

export function Text({ variant = 'body', color, align, style, children, ...rest }: TextProps) {
  const theme = useTheme();
  const resolvedColor = resolveColor(theme.colors, color) ?? theme.colors.text;
  // The uppercase roles (label, badge, tab, button, chip) are uppercased in the
  // actual text content — not just via the CSS-only textTransform style — so
  // accessibility trees and text queries see the real glyphs. Uppercase is only
  // ever reached through one of those roles; no screen does it by hand.
  const shouty = (UPPERCASE_ROLES as readonly string[]).includes(variant);
  const content = shouty && typeof children === 'string' ? children.toUpperCase() : children;

  return (
    <RNText
      style={[typography[variant], { color: resolvedColor }, align ? { textAlign: align } : null, style]}
      {...rest}
    >
      {content}
    </RNText>
  );
}
