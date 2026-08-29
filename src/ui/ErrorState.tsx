import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { IconDisc } from './IconDisc';
import { space } from './tokens/spacing';
import { PROSE } from './tokens/layout';

export type ErrorStateProps = {
  message: string;
  /** Omit where there is genuinely nothing to retry — a release build with no
   * `API_URL` baked in (`RootNavigator`'s config-error screen) is fixed by a
   * rebuild, not by tapping. A Retry button that cannot possibly help is worse
   * than no button. */
  onRetry?: () => void;
};

/** The same shell as `EmptyState`, with the danger tone on the glyph. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  return (
    <Card padding={0} style={styles.card}>
      <View style={styles.inner}>
        <IconDisc icon={AlertCircle} color={theme.colors.tone.danger.fg} />
        <Text variant="caption" color="muted" align="center" style={styles.message}>{message}</Text>
        {onRetry ? <Button label="Retry" onPress={onRetry} variant="outline" size="sm" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch' },
  inner: { alignItems: 'center', gap: space[3], paddingVertical: space[8] + 2, paddingHorizontal: space[5] },
  message: { maxWidth: PROSE.hint },
});
