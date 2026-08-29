import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { FieldShell, Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';
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
 * A line's rate, as the `wizard-3-cart` frame draws it: a compact field with
 * its own "Rate" caption inside the box. Tapping it (with the permission) turns
 * the value into an inline numeric input; **without** the permission it is not a
 * field at all — just the caption and the value as plain text, because a box
 * that takes no taps is an affordance that leads nowhere. Editing at all is what
 * marks the line "touched", which is what makes the payload send an explicit
 * rate instead of `null`, so a pencil that could only ever produce a 403 is
 * never drawn.
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

  const caption = <Text variant="label" color="muted">Rate</Text>;

  if (editing) {
    return (
      <FieldShell size="sm" focused left={caption} style={styles.shell} boxTestID={`rate-${sku}`}>
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

  // Without the permission there is nothing to tap, so there is no field: a
  // boxed value with a caption is an affordance that leads nowhere, and a rep
  // tapping it and getting nothing reads as a broken screen. The same label /
  // value pair, plain — it still lines up with the discount box beside it,
  // because both live in the same flexed row.
  if (!editable) {
    return (
      <View style={[styles.shell, styles.readOnly]}>
        {caption}
        <Text variant="bodySm" color={value ? 'text' : 'subtle'} align="right" numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  const box = (
    <FieldShell
      size="sm"
      left={caption}
      right={<Pencil size={12} color={theme.colors.subtle} />}
      style={styles.shell}
      boxTestID={`rate-${sku}`}
    >
      <Text variant="bodySm" color={value ? (touched ? 'text' : 'muted') : 'subtle'} align="right" numberOfLines={1}>
        {label}
      </Text>
    </FieldShell>
  );

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit rate for ${sku}`} onPress={() => setEditing(true)} style={styles.shell}>
      {box}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The shell is the kit's `sm` field — this only says how it shares the
  // controls row with the discount box beside it.
  shell: { flex: 1 },
  // No border, no fill, no chrome — the caption and the value, sharing the
  // `sm` field's own vertical rhythm so the row still reads as one line.
  readOnly: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], paddingVertical: space[2] },
  input: { flex: 1, padding: 0, textAlign: 'right' },
});
