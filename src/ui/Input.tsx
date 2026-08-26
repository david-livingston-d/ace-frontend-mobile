import React, { useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureToggle?: boolean;
  right?: React.ReactNode;
  /** A plain RN `TextInput` inside a `@gorhom/bottom-sheet` sheet never gets
   * focus on a real device — the sheet's pan-gesture handler claims the touch
   * first, so nothing types (verified on-device; invisible in Jest, where the
   * whole package is mocked). `BottomSheetTextInput` is the library's own
   * gesture-aware substitute, needed by any field rendered inside a `Sheet`
   * (e.g. `ReasonSheet`'s reason field). */
  sheetInput?: boolean;
};

export function Input({
  label,
  value,
  onChangeText,
  error,
  secureToggle,
  right,
  secureTextEntry,
  sheetInput,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const [reveal, setReveal] = useState(false);
  const Field = sheetInput ? BottomSheetTextInput : TextInput;

  return (
    <View>
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
        <Field
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureToggle ? !reveal : secureTextEntry}
          style={[styles.input, { color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textSubtle}
          {...rest}
        />
        {secureToggle ? (
          <IconButton
            icon={reveal ? EyeOff : Eye}
            label={reveal ? 'Hide password' : 'Show password'}
            onPress={() => setReveal((r) => !r)}
            size="sm"
          />
        ) : (
          right
        )}
      </View>
      {error ? (
        <Text variant="caption" color={theme.colors.tone.danger.fg} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: space[3] },
  input: { flex: 1, paddingVertical: space[2], fontSize: 15 },
  label: { marginBottom: space[1] },
  error: { marginTop: space[1] },
});
