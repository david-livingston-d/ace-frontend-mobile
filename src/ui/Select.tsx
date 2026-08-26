import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { ListRow } from './ListRow';
import { Sheet, useSheet } from './Sheet';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

export type SelectOption = { label: string; value: string };

export type SelectProps = {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  error?: string;
};

export function Select({ label, value, options, onChange, placeholder = 'Select', clearable, error }: SelectProps) {
  const theme = useTheme();
  const { ref, open, close } = useSheet();
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open}>
        <Text variant="label" color="textMuted" style={styles.label}>{label}</Text>
        <View
          style={[
            styles.row,
            {
              borderColor: error ? theme.colors.tone.danger.fg : theme.colors.border,
              borderRadius: radius.control,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text variant="body" color={current ? 'text' : 'textSubtle'} style={styles.value} numberOfLines={1}>
            {current ? current.label : placeholder}
          </Text>
          <ChevronDown size={18} color={theme.colors.textSubtle} />
        </View>
        {error ? (
          <Text variant="caption" color={theme.colors.tone.danger.fg} style={styles.error}>
            {error}
          </Text>
        ) : null}
      </Pressable>
      <Sheet ref={ref} title={label} scroll>
        {clearable ? <ListRow title={placeholder} onPress={() => { onChange(null); close(); }} /> : null}
        {options.map((o) => (
          <ListRow
            key={o.value}
            title={o.label}
            right={o.value === value ? <Check size={18} color={theme.colors.text} /> : null}
            onPress={() => { onChange(o.value); close(); }}
          />
        ))}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, paddingHorizontal: space[3], paddingVertical: space[2] },
  value: { flex: 1 },
  label: { marginBottom: space[1] },
  error: { marginTop: space[1] },
});
