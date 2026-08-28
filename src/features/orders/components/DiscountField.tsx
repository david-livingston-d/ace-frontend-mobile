import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { FieldShell, useTheme } from '@/ui';
import { typography } from '@/ui/tokens/typography';

export type DiscountFieldProps = {
  /** What the field is discounting — the SKU for a line, "order" for the header. */
  label: string;
  value: string;
  onChange: (pct: string) => void;
};

/** Whether the field's raw text still *means* the stored value — "", "0" and
 * "0." all mean the `'0'` the draft stores, so none of them should be
 * overwritten while the user is still typing "0.5". */
function echoes(text: string, value: string): boolean {
  const typed = text.trim();
  const stored = value.trim();
  if (typed === stored) return true;
  const asNumber = Number(typed || '0');
  return Number.isFinite(asNumber) && asNumber === Number(stored || '0');
}

/**
 * A percent input. Rendered only where the caller holds
 * `sales_order.discount_override` — the API rejects any non-zero discount
 * without it, so showing the field to anyone else would be an invitation to a
 * 403. `'0'` reads as blank so an untouched line isn't visually noisy.
 *
 * **Kit rule: money inputs commit on change, never on blur.** A `Pressable`
 * footer button doesn't blur a focused `TextInput`, so a discount typed and
 * then reviewed immediately used to be dropped on the floor — the payload sent
 * `discount_pct: '0'` for a line the user had just discounted. See `RateField`.
 */
export function DiscountField({ label, value, onChange }: DiscountFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState(Number(value) ? value : '');

  // Local echo for cursor stability only — resynced when the draft changes
  // underneath us (reset, hydrate), never when it changed *because of* us.
  useEffect(() => {
    setText((current) => (echoes(current, value) ? current : (Number(value) ? value : '')));
  }, [value]);

  function change(next: string) {
    setText(next);
    onChange(next.trim() || '0');
  }

  return (
    <FieldShell size="sm" style={styles.shell} boxTestID={`discount-${label}`}>
      <TextInput
        accessibilityLabel={`Discount % for ${label}`}
        value={text}
        onChangeText={change}
        placeholder="0%"
        placeholderTextColor={theme.colors.subtle}
        keyboardType="decimal-pad"
        style={[styles.input, typography.bodySm, { color: theme.colors.text }]}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  shell: { width: 72 },
  input: { flex: 1, padding: 0, textAlign: 'center' },
});
