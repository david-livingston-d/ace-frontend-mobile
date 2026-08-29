import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Card } from './Card';
import { space } from './tokens/spacing';
import { combine, shadow, toneShadow } from './tokens/elevation';
import type { StatusTone } from './tokens/colors';

export type KpiTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: StatusTone;
  /** `flat` is the home grid's full tile; `note` is the smaller, softer card
   * the money pair on `home-head` sits on (smaller radius, `note` shadow). */
  variant?: 'flat' | 'note';
  /** `center` is a tile in a grid of tiles; `left` is a figure in a row of
   * facts, where a centred label has nothing to centre against. */
  align?: 'center' | 'left';
  onPress?: () => void;
};

/**
 * A number on a card. The tone lives in the *number* and in the card's own
 * drop shadow (an outstanding figure glows faintly red) — never in a coloured
 * fill, which this system does not have.
 *
 * The one tile in the app: the home grid's KPIs and the Collected /
 * Outstanding money pair are the same component with different `variant` /
 * `align`, rather than two implementations of the same card that drift.
 */
export function KpiTile({ label, value, hint, tone, variant = 'flat', align = 'center', onPress }: KpiTileProps) {
  const theme = useTheme();
  const valueColor = tone ? theme.colors.tone[tone].fg : theme.colors.text;
  const textAlign = align === 'left' ? 'left' : 'center';
  // The tint is composed onto whatever `shadow()` decided this platform can
  // draw, never onto the raw recipe: where the platform has no `boxShadow` at
  // all (Android < 28) there is nothing to override and the `Card`'s own gated
  // hairline stands. Same composition pattern as `Chip`.
  const base = shadow(variant === 'note' ? 'note' : 'card', theme.mode);
  const toned =
    tone && base.boxShadow
      ? { boxShadow: combine(base.boxShadow, toneShadow(tone, theme.mode)) }
      : null;

  return (
    <Card
      variant={variant}
      onPress={onPress}
      padding={variant === 'note' ? 'row' : 3}
      style={[styles.tile, toned]}
    >
      <Text variant="label" color="muted" align={textAlign}>{label}</Text>
      <Text variant="stat" color={valueColor} align={textAlign} style={styles.value}>{value}</Text>
      {hint ? <Text variant="caption" color="subtle" align={textAlign}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'stretch' },
  value: { marginTop: space[1] },
});
