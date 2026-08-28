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
import { radius } from '@/ui/tokens/radius';
import { CONTROL } from '@/ui/tokens/layout';
import { selectionHalo } from '@/ui/tokens/elevation';
import { formatDateTime } from '@/lib/format/date';
import type { TimelineItem } from '../types';

export type TimelineListProps = { items: TimelineItem[] };

/**
 * Which glyph a timeline event wears (canvas edit #1). Matched on the audit
 * `action` string the API sends rather than on a client-side enum, so a new
 * backend action degrades to the neutral check instead of crashing.
 *
 * **The document tests come before `create`**: nearly every action string ends
 * in `.create`, so checking that first handed the plus to reservations,
 * delivery notes and invoices alike (seen on device). `create` is the *order's*
 * own glyph — the fallback for anything created that is not one of the
 * documents below it.
 */
export function iconForAction(action: string): LucideIcon {
  const a = action.toLowerCase();
  if (a.includes('stock_check') || a.includes('stock check')) return Search;
  if (a.includes('reserv')) return Lock;
  if (a.includes('deliver') || a.includes('dispatch') || a.includes('dn')) return Truck;
  if (a.includes('return')) return RotateCcw;
  if (a.includes('payment') || a.includes('invoice')) return Receipt;
  if (a.includes('cancel')) return RotateCcw;
  if (a.includes('approv')) return PenLine;
  if (a.includes('close')) return CircleCheck;
  if (a.includes('create')) return Plus;
  return Check;
}

/**
 * The order's history (canvas edit #1): a 22 px icon disc per event on a 2 px
 * rail, the newest one haloed as the order's current state.
 *
 * There are no *future* nodes here (the canvas dims those to 45 %): the API's
 * `/sales-orders/{id}/timeline` returns audit events, and an event that has
 * not happened has nothing to report — the phase dots on the order-detail
 * screen are what show the road ahead.
 *
 * Rendered chronologically ascending, exactly as the API returns them — no
 * client-side re-sorting.
 */
export function TimelineList({ items }: TimelineListProps) {
  const theme = useTheme();
  return (
    <View>
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        return (
          <View key={`${item.at}-${index}`} style={styles.row}>
            <View style={styles.discCol}>
              <View style={isCurrent ? [styles.halo, selectionHalo(theme.colors.page, theme.colors.dim)] : null}>
                <IconDisc
                  icon={iconForAction(item.action)}
                  size={CONTROL.timelineDisc}
                  color={isCurrent ? theme.colors.text : theme.colors.muted}
                />
              </View>
              {!isCurrent ? <View style={[styles.rail, { backgroundColor: theme.colors.dim }]} /> : null}
            </View>
            <View style={styles.content}>
              <Text variant="rowStrong">{item.summary}</Text>
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
  halo: { borderRadius: radius.pill },
  rail: { flex: 1, width: 2, marginVertical: space[1] },
  content: { flex: 1, paddingBottom: space[4], gap: space[1] - 2 },
  reason: { marginTop: space[1] },
});
