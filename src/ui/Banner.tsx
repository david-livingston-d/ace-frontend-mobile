import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Button } from './Button';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import type { StatusTone } from './tokens/colors';

export type BannerProps = {
  tone: StatusTone;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
};

export function Banner({ tone, title, body, action }: BannerProps) {
  const theme = useTheme();
  const pair = theme.colors.tone[tone];

  return (
    <View style={[styles.container, { backgroundColor: pair.bg, borderRadius: radius.control }]}>
      <Text variant="h4" color={pair.fg}>{title}</Text>
      {body ? (
        <Text variant="bodySm" color={pair.fg} style={styles.body}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="ghost" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space[4] },
  body: { marginTop: space[1] },
  action: { marginTop: space[3], alignSelf: 'flex-start' },
});
