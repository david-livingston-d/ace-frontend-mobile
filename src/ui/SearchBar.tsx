import React, { useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { FieldShell } from './FieldShell';
import { IconButton } from './IconButton';
import { typography } from './tokens/typography';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/**
 * The search field: the same `FieldShell` every other field uses, in its pill
 * form (`.inp.srch` — full-round, outer shadow instead of an inset one) with
 * the magnifying glass in the leading slot.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search' }: SearchBarProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell
      pill
      focused={focused}
      boxTestID="search-box"
      left={<Search size={18} color={theme.colors.muted} />}
      right={value ? <IconButton icon={X} label="Clear search" size="sm" onPress={() => onChangeText('')} /> : null}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel="Search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={theme.colors.subtle}
        style={[styles.input, typography.bodySm, { color: theme.colors.text }]}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({ input: { flex: 1, padding: 0 } });
