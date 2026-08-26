import React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { IconButton } from './IconButton';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/**
 * A dedicated field rather than a composition over `Input`: `Input` has no
 * leading-icon slot (only `right`), and a search field reads as a search
 * field only with the magnifying glass on the left.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search' }: SearchBarProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.colors.border, borderRadius: radius.control, backgroundColor: theme.colors.surface }]}>
      <Search size={18} color={theme.colors.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel="Search"
        placeholderTextColor={theme.colors.textSubtle}
        style={[styles.input, { color: theme.colors.text }]}
      />
      {value ? <IconButton icon={X} label="Clear search" size="sm" onPress={() => onChangeText('')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], borderWidth: 1, paddingHorizontal: space[3] },
  input: { flex: 1, paddingVertical: space[2], fontSize: 15 },
});
