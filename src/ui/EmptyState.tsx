import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Button } from './Button';
import { space } from './tokens/spacing';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon: Icon, title, hint, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Icon size={32} color={theme.colors.textSubtle} />
      <Text variant="h4" align="center" style={styles.title}>{title}</Text>
      {hint ? (
        <Text variant="bodySm" color="textMuted" align="center" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="outline" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: space[6] },
  title: { marginTop: space[3] },
  hint: { marginTop: space[1] },
  action: { marginTop: space[4] },
});
