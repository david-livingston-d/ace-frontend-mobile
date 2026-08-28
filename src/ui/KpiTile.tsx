import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Card } from './Card';
import { space } from './tokens/spacing';
import { combine, shadows, toneShadow } from './tokens/elevation';
import type { StatusTone } from './tokens/colors';

export type KpiTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: StatusTone;
  onPress?: () => void;
};

/**
 * A number on a card. The tone lives in the *number* and in the card's own
 * drop shadow (an outstanding figure glows faintly red) — never in a coloured
 * fill, which this system does not have.
 */
export function KpiTile({ label, value, hint, tone, onPress }: KpiTileProps) {
  const theme = useTheme();
  const valueColor = tone ? theme.colors.tone[tone].fg : theme.colors.text;

  return (
    <Card
      onPress={onPress}
      padding={3}
      style={[
        styles.tile,
        tone ? { boxShadow: combine(shadows[theme.mode].card, toneShadow(tone, theme.mode)) } : null,
      ]}
    >
      <Text variant="label" color="muted" align="center">{label}</Text>
      <Text variant="stat" color={valueColor} align="center" style={styles.value}>{value}</Text>
      {hint ? <Text variant="caption" color="subtle" align="center">{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'stretch' },
  value: { marginTop: space[1] },
});
