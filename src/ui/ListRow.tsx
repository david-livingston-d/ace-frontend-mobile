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

export function ListRow({ title, subtitle, right, onPress, chevron }: ListRowProps) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.text}>
        <Text variant="body">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <ChevronRight size={18} color={theme.colors.textSubtle} /> : null}
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
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space[2],
  },
  text: { flex: 1 },
});
