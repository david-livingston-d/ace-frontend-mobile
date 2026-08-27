import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, StyleSheet } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { formatMoney } from '@/lib/format/money';

export type RateFieldProps = {
  sku: string;
  value: string;
  touched: boolean;
  /** `sales_order.rate_override` — without it the rate is read-only text.
   * Never a role check: pricing authority is a permission (PRD §4). */
  editable: boolean;
  onChange: (rate: string) => void;
};

/**
 * A line's rate: plain text until the pencil is tapped, then an inline numeric
 * input. Editing at all is what marks the line "touched", which is what makes
 * the payload send an explicit rate instead of `null` — so the pencil is
 * hidden entirely without `sales_order.rate_override` rather than shown
 * disabled, since tapping it could only ever produce a 403.
 */
export function RateField({ sku, value, touched, editable, onChange }: RateFieldProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  function commit() {
    setEditing(false);
    if (text.trim() !== value.trim()) onChange(text.trim());
  }

  if (editing) {
    return (
      <TextInput
        accessibilityLabel={`Rate for ${sku}`}
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        autoFocus
        keyboardType="decimal-pad"
        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: radius.control }]}
      />
    );
  }

  const label = value ? formatMoney(value) : 'No price';

  if (!editable) {
    return (
      <Text variant="bodySm" color={value ? 'textMuted' : 'textSubtle'}>
        {label}
      </Text>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit rate for ${sku}`}
      onPress={() => setEditing(true)}
      style={styles.trigger}
    >
      <Text variant="bodySm" color={touched ? 'text' : 'textMuted'}>{label}</Text>
      <Pencil size={12} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  input: { borderWidth: 1, minWidth: 88, paddingHorizontal: space[2], paddingVertical: space[1] },
});
