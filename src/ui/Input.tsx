import React, { useState } from 'react';
import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { FieldShell } from './FieldShell';
import { IconButton } from './IconButton';
import { SheetTextInput } from './SheetTextInput';
import { typography } from './tokens/typography';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  /** A line under the field — `MoneyInput`'s formatted echo, a hint. */
  helper?: string;
  secureToggle?: boolean;
  right?: React.ReactNode;
  /** Rendered before the field, inside the same shell (e.g.
   * `MoneyInput`'s `₹`). */
  left?: React.ReactNode;
  /** A taller box for a multi-line field. */
  tall?: boolean;
  /** A plain RN `TextInput` inside a `@gorhom/bottom-sheet` sheet never gets
   * focus on a real device: `@gorhom/bottom-sheet`'s own `BottomSheetTextInput`
   * imports `TextInput` from `react-native-gesture-handler`, but RNGH 3.x
   * only exports that component as `LegacyTextInput` (see
   * `node_modules/react-native-gesture-handler/lib/module/index.js`) — so
   * `BottomSheetTextInput` renders `undefined` and nothing types (verified
   * on-device; invisible in Jest, where the whole `@gorhom/bottom-sheet`
   * package is mocked). `SheetTextInput` is the gesture-aware substitute —
   * `LegacyTextInput` plus the same `useBottomSheetInternal` keyboard-target
   * registration the real `BottomSheetTextInput` does, so the sheet still
   * rises to meet the keyboard. Needed by any field rendered inside a `Sheet`
   * (e.g. `ReasonSheet`'s reason field). */
  sheetInput?: boolean;
};

export function Input({
  label,
  value,
  onChangeText,
  error,
  helper,
  secureToggle,
  right,
  left,
  tall,
  secureTextEntry,
  sheetInput,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const [reveal, setReveal] = useState(false);
  const [focused, setFocused] = useState(false);

  // A sheet-hosted field needs real keyboard-target registration (see
  // `SheetTextInput`'s own doc comment) — delegated wholesale rather than
  // just swapping which primitive renders the field, since that registration
  // has to wrap the field's own focus/blur handlers.
  if (sheetInput) {
    return (
      <SheetTextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={error}
        helper={helper}
        secureToggle={secureToggle}
        right={right}
        left={left}
        tall={tall}
        secureTextEntry={secureTextEntry}
        onFocus={onFocus}
        onBlur={onBlur}
        {...rest}
      />
    );
  }

  return (
    <FieldShell
      label={label}
      error={error}
      helper={helper}
      focused={focused}
      tall={tall}
      left={left}
      right={
        secureToggle ? (
          <IconButton
            icon={reveal ? EyeOff : Eye}
            label={reveal ? 'Hide password' : 'Show password'}
            onPress={() => setReveal((r) => !r)}
            size="sm"
          />
        ) : (
          right
        )
      }
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        secureTextEntry={secureToggle ? !reveal : secureTextEntry}
        style={[styles.input, typography.bodySm, { color: theme.colors.text }]}
        placeholderTextColor={theme.colors.subtle}
        {...rest}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, padding: 0 },
});
