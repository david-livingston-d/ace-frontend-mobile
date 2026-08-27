import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';

export type DiscountFieldProps = {
  /** What the field is discounting — the SKU for a line, "order" for the header. */
  label: string;
  value: string;
  onChange: (pct: string) => void;
};

/**
 * A percent input. Rendered only where the caller holds
 * `sales_order.discount_override` — the API rejects any non-zero discount
 * without it, so showing the field to anyone else would be an invitation to a
 * 403. `'0'` reads as blank so an untouched line isn't visually noisy.
 */
export function DiscountField({ label, value, onChange }: DiscountFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState(Number(value) ? value : '');

  useEffect(() => {
    setText(Number(value) ? value : '');
  }, [value]);

  return (
    <TextInput
      accessibilityLabel={`Discount % for ${label}`}
      value={text}
      onChangeText={setText}
      onBlur={() => onChange(text.trim() || '0')}
      onSubmitEditing={() => onChange(text.trim() || '0')}
      placeholder="0%"
      placeholderTextColor={theme.colors.textSubtle}
      keyboardType="decimal-pad"
      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: radius.control }]}
    />
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, width: 64, textAlign: 'center', paddingHorizontal: space[2], paddingVertical: space[1] },
});
