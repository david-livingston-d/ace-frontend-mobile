import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
};

/** A hairline-separated line inside a card or a sheet (a `Select`'s options,
 * a settings list). Lists of *documents* use `RowCard` instead. */
export function ListRow({ title, subtitle, right, onPress, chevron }: ListRowProps) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, { borderBottomColor: theme.colors.hairline }]}>
      <View style={styles.text}>
        <Text variant="bodySm">{title}</Text>
        {subtitle ? <Text variant="caption" color="muted">{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <ChevronRight size={18} color={theme.colors.subtle} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space[2],
  },
  text: { flex: 1, gap: space[1] - 3 },
});
