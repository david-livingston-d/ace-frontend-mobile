import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { IconDisc } from './IconDisc';
import { space } from './tokens/spacing';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
};

/** "Nothing here yet" as a card, not a hole in the page (`.empty`): a sunken
 * icon disc, a short title, one line of explanation and at most one way out. */
export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <Card padding={0} style={styles.card}>
      <View style={styles.inner}>
        <IconDisc icon={icon} />
        <Text variant="rowTitle" align="center">{title}</Text>
        {hint ? (
          <Text variant="caption" color="muted" align="center" style={styles.hint}>{hint}</Text>
        ) : null}
        {action ? (
          <Button label={action.label} onPress={action.onPress} variant="outline" size="sm" />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch' },
  inner: { alignItems: 'center', gap: space[3], paddingVertical: space[8] + 2, paddingHorizontal: space[5] },
  hint: { maxWidth: 240 },
});
