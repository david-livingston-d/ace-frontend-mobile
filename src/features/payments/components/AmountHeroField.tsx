import React, { useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { FieldShell, Text, useTheme } from '@/ui';
import { typography } from '@/ui/tokens/typography';
import { sanitizeMoneyInput } from '@/ui/MoneyInput';

export type AmountHeroFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** A line under the box — the excess-becomes-advance note. */
  helper?: string;
  autoFocus?: boolean;
};

/**
 * The record-payment amount (`record-payment` frame's `.moneyfield`): the one
 * figure the whole screen exists to capture, so it is typed at 29/600 with a
 * muted `₹` glyph beside it rather than in the same 13 px box as the reference
 * number. Same sanitising contract as `MoneyInput` — every keystroke goes
 * through `sanitizeMoneyInput`, so the caller's state is always a clean
 * decimal string.
 */
export function AmountHeroField({ value, onChange, error, helper, autoFocus }: AmountHeroFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <FieldShell
      label="Amount"
      error={error}
      helper={helper}
      focused={focused}
      size="hero"
      left={<Text variant="amountHero" color="muted" style={styles.rupee}>₹</Text>}
    >
      <TextInput
        accessibilityLabel="Amount"
        value={value}
        onChangeText={(text) => onChange(sanitizeMoneyInput(text))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={theme.colors.subtle}
        autoFocus={autoFocus}
        maxFontSizeMultiplier={1.2}
        style={[styles.input, typography.amountHero, { color: theme.colors.text }]}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  // `.rs` — the glyph is lighter and quieter than the digits it precedes.
  rupee: { opacity: 0.55 },
  input: { flex: 1, padding: 0 },
});
