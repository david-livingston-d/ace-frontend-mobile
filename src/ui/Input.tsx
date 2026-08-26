import React, { useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
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
};

export function Input({
  label,
  value,
  onChangeText,
  error,
  secureToggle,
  right,
  secureTextEntry,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const [reveal, setReveal] = useState(false);

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
        <TextInput
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
