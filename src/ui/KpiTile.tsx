import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Card } from './Card';
import { space } from './tokens/spacing';
import type { StatusTone } from './tokens/colors';

export type KpiTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: StatusTone;
  onPress?: () => void;
};

export function KpiTile({ label, value, hint, tone, onPress }: KpiTileProps) {
  const theme = useTheme();
  const valueColor = tone ? theme.colors.tone[tone].fg : theme.colors.textStrong;

  return (
    <Card onPress={onPress} depth="soft">
      <Text variant="label" color="textMuted">{label}</Text>
      <Text variant="kpi" color={valueColor} style={styles.value}>{value}</Text>
      {hint ? (
        <Text variant="caption" color="textSubtle">
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({ value: { marginTop: space[1] } });
