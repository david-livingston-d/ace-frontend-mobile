import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Button } from './Button';
import { space } from './tokens/spacing';

export type ErrorStateProps = {
  message: string;
  /** Omit where there is genuinely nothing to retry — a release build with no
   * `API_URL` baked in (`RootNavigator`'s config-error screen) is fixed by a
   * rebuild, not by tapping. A Retry button that cannot possibly help is worse
   * than no button. */
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <AlertCircle size={32} color={theme.colors.tone.danger.fg} />
      <Text variant="bodySm" color="textMuted" align="center" style={styles.message}>
        {message}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label="Retry" onPress={onRetry} variant="outline" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: space[6] },
  message: { marginTop: space[3] },
  action: { marginTop: space[4] },
});
