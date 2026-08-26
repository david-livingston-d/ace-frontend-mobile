import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from './useTheme';

export type DividerProps = ViewProps;

export function Divider({ style, ...rest }: DividerProps) {
  const theme = useTheme();
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }, style]}
      {...rest}
    />
  );
}
