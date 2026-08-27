import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from './Input';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { formatMoney } from '@/lib/format/money';

export type MoneyInputProps = {
  label: string;
  /** A decimal string, e.g. `'1234.50'` — never a JS number (see `formatMoney`'s
   * own comment on why money never goes through one). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Renders inside a `Sheet` (a payment amount typed inside a bottom sheet) —
   * routes through `Input`'s `sheetInput` path so the sheet still rises with
   * the keyboard. */
  sheet?: boolean;
  autoFocus?: boolean;
};

/**
 * Strips a decimal-pad edit down to digits and at most one `.`, capped at two
 * fractional digits. Money is always typed here, never pasted pre-formatted,
 * so this only has to guard against a stray non-digit (some keyboards still
 * show letters) and a second `.` (autocorrect/paste) — it never reformats
 * what the user is mid-typing (no grouping, no padding), that's what the
 * `formatMoney` helper line below the field is for.
 */
export function sanitizeMoneyInput(raw: string): string {
  const digitsAndDot = raw.replace(/[^0-9.]/g, '');
  const firstDot = digitsAndDot.indexOf('.');
  if (firstDot === -1) return digitsAndDot;
  const whole = digitsAndDot.slice(0, firstDot);
  const frac = digitsAndDot.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
  return `${whole}.${frac}`;
}

/**
 * The numeric-keypad money field used for every payment/allocation amount —
 * a themed `Input` with a `₹` prefix, a decimal-pad keyboard, and every
 * keystroke sanitised through `sanitizeMoneyInput` before it reaches
 * `onChange` (so the caller's state is always a clean decimal string, never
 * a value with two dots or a stray letter in it). `onChange` fires on every
 * change — this never silently rewrites what's already been typed.
 */
export function MoneyInput({ label, value, onChange, error, sheet, autoFocus }: MoneyInputProps) {
  return (
    <View>
      <Input
        label={label}
        accessibilityLabel={label}
        value={value}
        onChangeText={(text) => onChange(sanitizeMoneyInput(text))}
        keyboardType="decimal-pad"
        sheetInput={sheet}
        autoFocus={autoFocus}
        left={<Text variant="body" color="textMuted">₹</Text>}
        error={error}
      />
      <Text variant="caption" color="textSubtle" style={styles.helper}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  helper: { marginTop: space[1] },
});
