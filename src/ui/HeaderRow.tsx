import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { space } from './tokens/spacing';

export type HeaderRowProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** A card's header line: title on the left, badge/action on the right. Five
 * detail screens had forked the same three style properties for it. */
export function HeaderRow({ children, style }: HeaderRowProps) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
});
