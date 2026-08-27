import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatDateTime } from '@/lib/format/date';
import type { TimelineItem } from '../types';

export type TimelineListProps = { items: TimelineItem[] };

/** Rendered chronologically ascending, exactly as the API returns
 * `/sales-orders/{id}/timeline` — no client-side re-sorting. */
export function TimelineList({ items }: TimelineListProps) {
  const theme = useTheme();
  return (
    <View>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <View key={`${item.at}-${index}`} style={styles.row}>
            <View style={styles.dotCol}>
              <View style={[styles.dot, { backgroundColor: isLast ? theme.colors.solidBg : theme.colors.border }]} />
              {!isLast ? <View style={[styles.line, { backgroundColor: theme.colors.border }]} /> : null}
            </View>
            <View style={styles.content}>
              <Text variant="body">{item.summary}</Text>
              <Text variant="caption" color="textMuted">
                {formatDateTime(item.at)}
                {item.user_name ? ` · ${item.user_name}` : ''}
              </Text>
              {item.reason ? (
                <Text variant="bodySm" color="textMuted" style={styles.reason}>
                  {item.reason}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  dotCol: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { flex: 1, width: 2, marginTop: 4 },
  content: { flex: 1, paddingBottom: space[4] },
  reason: { marginTop: space[1] },
});
