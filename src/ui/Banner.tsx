import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { space } from './tokens/spacing';
import { combine, shadows } from './tokens/elevation';
import type { StatusTone } from './tokens/colors';

export type BannerProps = {
  tone: StatusTone;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
};

/**
 * An inline note (`.note`) — a small card, not a coloured slab. The tone lives
 * in the title and, for an error, in a ring around the card, so a warning
 * reads as information the user can act on rather than as an alarm.
 */
export function Banner({ tone, title, body, action }: BannerProps) {
  const theme = useTheme();
  const pair = theme.colors.tone[tone];
  const ringed =
    tone === 'danger'
      ? { boxShadow: combine(shadows[theme.mode].note, `inset 0 0 0 1px ${theme.colors.errRing}`) }
      : null;

  return (
    <Card variant="note" style={ringed}>
      <Text variant="rowTitle" color={pair.fg}>{title}</Text>
      {body ? (
        <Text variant="caption" color="muted" style={styles.body}>{body}</Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="ghost" size="sm" />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: space[1] },
  action: { marginTop: space[2], alignSelf: 'flex-start' },
});
