import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { shadow } from './tokens/elevation';
import { controlRadius, radius } from './tokens/radius';
import { CONTROL } from './tokens/layout';
import { gapField, gapInline, space } from './tokens/spacing';

export type FieldShellProps = {
  /** Rendered above the box, uppercased. */
  label?: string;
  /** Replaces `helper` and tints the ring. */
  error?: string;
  /** A line under the box — a formatted echo of the value, a hint. */
  helper?: string;
  /** `md` (50 px, the form field), `sm` (44 px, an inline rate/discount) or
   * `hero` (78 px, the record-payment amount — `.moneyfield`). */
  size?: 'md' | 'sm' | 'hero';
  /** Draws the jet focus ring. The field itself owns its focus state — the
   * shell only draws it. */
  focused?: boolean;
  /** Pill shell with an outer shadow instead of an inset one — the search bar. */
  pill?: boolean;
  /** A taller box for a multi-line field. */
  tall?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  boxTestID?: string;
};

/**
 * The one field surface in the app: an inset white box with a hairline ring,
 * a jet ring when focused and a red one when it is wrong (`redesign.css`
 * §10 `.inp`). `Input`, `SheetTextInput`, `MoneyInput`, `Select`, `DateField`,
 * `SearchBar`, `RateField` and `DiscountField` all render *through* it, which
 * is what makes a form field, a sheet field and an inline rate field look like
 * one system — and what deleted the five near-identical `styles.row` blocks
 * they each used to carry.
 */
export function FieldShell({
  label,
  error,
  helper,
  size = 'md',
  focused,
  pill,
  tall,
  left,
  right,
  children,
  style,
  boxTestID = 'field-box',
}: FieldShellProps) {
  const theme = useTheme();
  const ring = error
    ? { color: theme.colors.errRing, width: 1.5 }
    : focused
      ? { color: theme.colors.focus, width: 1.5 }
      : { color: pill ? theme.colors.ring : theme.colors.ringSoft, width: 1 };

  return (
    <View style={style}>
      {label ? <Text variant="label" color="muted" style={styles.label}>{label}</Text> : null}
      <View
        testID={boxTestID}
        style={[
          styles.box,
          {
            backgroundColor: theme.colors.card,
            minHeight: tall || size === 'hero' ? CONTROL.fieldTall : size === 'sm' ? CONTROL.fieldSm : CONTROL.field,
            borderRadius: pill ? radius.pill : size === 'sm' ? controlRadius.fieldSm : controlRadius.field,
            paddingHorizontal: size === 'sm' ? space[3] : space[4],
          },
          tall ? styles.tall : styles.centred,
          shadow(pill ? 'outline' : 'inset', theme.mode, ring),
        ]}
      >
        {left}
        <View style={styles.body}>{children}</View>
        {right}
      </View>
      {error ? (
        <Text variant="caption" color={theme.colors.tone.danger.fg} style={styles.helper}>{error}</Text>
      ) : helper ? (
        <Text variant="caption" color="muted" style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: gapInline },
  centred: { alignItems: 'center' },
  // A multi-line field aligns its content to the top of the box instead.
  tall: { alignItems: 'flex-start', paddingTop: space[3] },
  body: { flex: 1, justifyContent: 'center' },
  label: { marginBottom: gapField },
  helper: { marginTop: gapField, paddingLeft: space[1] },
});
