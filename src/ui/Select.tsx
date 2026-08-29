import React from 'react';
import { Pressable } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { FieldShell } from './FieldShell';
import { ListRow } from './ListRow';
import { Sheet, useSheet } from './Sheet';

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
        <FieldShell
          label={label}
          error={error}
          right={<ChevronDown size={18} color={theme.colors.muted} />}
        >
          <Text variant="bodySm" color={current ? 'text' : 'subtle'} numberOfLines={1}>
            {current ? current.label : placeholder}
          </Text>
        </FieldShell>
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
