import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, StyleSheet } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { FieldShell, Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';
import { hit } from '@/ui/tokens/layout';
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
 *
 * **Kit rule: money inputs commit on change, never on blur.** The wizard's
 * footer buttons are `Pressable`s, and pressing one does not blur a focused
 * `TextInput` — a rate typed and then "Review order"ed straight away never
 * reached the draft at all, and the payload went out with `rate: null` for a
 * line the user had just re-priced. `validateDraft` tolerates half-typed text
 * ("4", "45."), so there is nothing to wait for.
 */
export function RateField({ sku, value, touched, editable, onChange }: RateFieldProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  // The local echo exists only for cursor stability: it resyncs on a *genuine*
  // external change (a draft reset, an edit hydrating from a saved order) and
  // otherwise leaves what the user typed exactly as typed, rather than bouncing
  // the trimmed value back into the field on every keystroke.
  useEffect(() => {
    setText((current) => (current.trim() === value.trim() ? current : value));
  }, [value]);

  function change(next: string) {
    setText(next);
    onChange(next.trim());
  }

  if (editing) {
    return (
      <FieldShell size="sm" focused style={styles.shell} boxTestID={`rate-${sku}`}>
        <TextInput
          accessibilityLabel={`Rate for ${sku}`}
          value={text}
          onChangeText={change}
          onBlur={() => setEditing(false)}
          onSubmitEditing={() => setEditing(false)}
          autoFocus
          keyboardType="decimal-pad"
          style={[styles.input, typography.bodySm, { color: theme.colors.text }]}
        />
      </FieldShell>
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
      hitSlop={hit.link}
      style={styles.trigger}
    >
      <Text variant="bodySm" color={touched ? 'text' : 'textMuted'}>{label}</Text>
      <Pencil size={12} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  // The shell is the kit's `sm` field — this only says how wide it is here.
  shell: { minWidth: 96 },
  input: { flex: 1, padding: 0, textAlign: 'right' },
});
