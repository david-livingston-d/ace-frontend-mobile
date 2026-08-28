import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Check,
  CircleCheck,
  Lock,
  PenLine,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Truck,
  type LucideIcon,
} from 'lucide-react-native';
import { IconDisc, Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { CONTROL } from '@/ui/tokens/layout';
import { formatDateTime } from '@/lib/format/date';
import type { TimelineItem } from '../types';

export type TimelineListProps = { items: TimelineItem[] };

/**
 * Which glyph a timeline event wears (canvas edit #1). Matched on the audit
 * `action` string the API sends rather than on a client-side enum, so a new
 * backend action degrades to the neutral check instead of crashing.
 */
export function iconForAction(action: string): LucideIcon {
  const a = action.toLowerCase();
  if (a.includes('create')) return Plus;
  if (a.includes('stock_check') || a.includes('stock check')) return Search;
  if (a.includes('reserve')) return Lock;
  if (a.includes('deliver') || a.includes('dispatch') || a.includes('dn')) return Truck;
  if (a.includes('payment') || a.includes('invoice')) return Receipt;
  if (a.includes('return') || a.includes('cancel')) return RotateCcw;
  if (a.includes('approv')) return PenLine;
  if (a.includes('close')) return CircleCheck;
  return Check;
}

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
            <View style={styles.discCol}>
              <IconDisc
                icon={iconForAction(item.action)}
                size={CONTROL.timelineDisc}
                color={isLast ? theme.colors.text : theme.colors.muted}
              />
              {!isLast ? <View style={[styles.rail, { backgroundColor: theme.colors.dim }]} /> : null}
            </View>
            <View style={styles.content}>
              <Text variant="bodySm">{item.summary}</Text>
              <Text variant="caption" color="muted">
                {formatDateTime(item.at)}
                {item.user_name ? ` · ${item.user_name}` : ''}
              </Text>
              {item.reason ? (
                <Text variant="caption" color="muted" style={styles.reason}>
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
  row: { flexDirection: 'row', gap: space[3] },
  discCol: { width: CONTROL.timelineDisc, alignItems: 'center' },
  rail: { flex: 1, width: 2, marginVertical: space[1] },
  content: { flex: 1, paddingBottom: space[4], gap: space[1] - 2 },
  reason: { marginTop: space[1] },
});
