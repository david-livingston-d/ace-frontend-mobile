import React from 'react';
import { Pressable, View, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from './useTheme';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

export type CardProps = ViewProps & {
  padding?: keyof typeof space;
  depth?: 'flat' | 'soft';
  onPress?: () => void;
  children?: React.ReactNode;
};

export function Card({ padding = 4, depth = 'flat', onPress, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  const content = (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: radius.control,
          padding: space[padding],
          borderWidth: depth === 'soft' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          elevation: depth === 'soft' ? 1 : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}
