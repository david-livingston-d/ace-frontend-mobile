import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import type { StatusTone } from './tokens/colors';

export type MetricItem = { label: string; value: string; tone?: StatusTone };

export type MetricsStripProps = { items: MetricItem[] };

/**
 * The "Qty · Reserved · To deliver · To collect" line under a row title
 * (`.metrics`). Quantities are the point of this app — an order is never one
 * status — so every row carries them rather than hiding them one tap away.
 */
export function MetricsStrip({ items }: MetricsStripProps) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={styles.strip}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          {/* Never wrapped: a label like "To collect" is 2 em-spaced caps and
              broke to two lines the moment the strip lost a few pixels. */}
          <Text variant="label" color="muted" numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.label}</Text>
          <Text
            variant="rowStrong"
            color={item.tone ? theme.colors.tone[item.tone].fg : theme.colors.text}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2] },
  item: { gap: space[1] - 2, flexShrink: 1 },
});
