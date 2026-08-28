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
import { CONTROL, TIMELINE_FUTURE_OPACITY } from '@/ui/tokens/layout';
import { selectionHalo } from '@/ui/tokens/elevation';
import { formatDateTime } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import { PHASES, isOpenPhase, phaseLabel } from '@/lib/sales/status';
import type { TimelineItem } from '../types';

/** A step the order has *not* reached yet — drawn dimmed under the history. */
export type FutureNode = { key: string; label: string; hint?: string; icon: LucideIcon };

export type TimelineListProps = { items: TimelineItem[]; future?: FutureNode[] };

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
 *
 * The phase names are matched by the same rules (`fully_reserved` -> lock,
 * `payment_pending` -> receipt), which is why the future nodes below reuse it.
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
 * Phases that are never a *next step* on the rail, and so never a future node:
 * the two `partially_*` states are outcomes of a step rather than steps of
 * their own (an order can reach `fully_reserved` without ever being partial),
 * `ready_to_close` is a derived readiness flag that the `closed` node already
 * states in words, and `short_closed` / `cancelled` are alternative *endings* —
 * never the road ahead.
 */
const NOT_A_STEP = new Set(['partially_reserved', 'partially_delivered', 'ready_to_close', 'short_closed', 'cancelled']);

/** What a step reads as before it has happened — "Delivered", not "Fully
 * delivered", which is the name of a state and not of a thing still to do. */
const FUTURE_LABELS: Record<string, string> = {
  ready_for_stock_check: 'Ready for stock check',
  fully_reserved: 'Stock reserved',
  fully_delivered: 'Delivered',
  payment_pending: 'Payment received',
  closed: 'Order closed',
};

/**
 * The road ahead (canvas edit #1: future nodes at 45 %). The timeline endpoint
 * returns audit events, and an event that has not happened is not in the
 * payload — so the remaining steps are *derived* from the order's phase, in
 * `PHASES` order, minus the ones that are not steps (`NOT_A_STEP`).
 *
 * A finished order (closed / short-closed / cancelled) has no road ahead and
 * gets none. The money hint mirrors the `timeline` frame, whose payment-pending
 * order ends on "Order closed · Pending ₹3,208.75".
 */
export function futureNodes(phase: string, receivable?: string | null): FutureNode[] {
  const index = PHASES.indexOf(phase);
  if (index < 0 || !isOpenPhase(phase)) return [];
  const outstanding = Number(receivable ?? '0');
  const pending = Number.isFinite(outstanding) && outstanding > 0 ? `Pending ${formatMoney(receivable as string)}` : null;

  return PHASES.slice(index + 1)
    .filter((p) => !NOT_A_STEP.has(p))
    .map((p) => ({
      key: p,
      label: FUTURE_LABELS[p] ?? phaseLabel(p),
      hint:
        pending && (p === 'payment_pending' || p === 'closed')
          ? pending
          : p === 'closed'
            ? 'Requires delivery + payment resolved'
            : undefined,
      icon: iconForAction(p),
    }));
}

/**
 * The order's history and what is still to come (canvas edit #1): a 22 px icon
 * disc per node on a 2 px rail, the newest *event* haloed as the order's
 * current state, and the remaining lifecycle steps under it at 45 % opacity.
 *
 * Events render chronologically ascending, exactly as the API returns them —
 * no client-side re-sorting.
 */
export function TimelineList({ items, future = [] }: TimelineListProps) {
  const last = items.length - 1;

  return (
    <View>
      {items.map((item, index) => {
        const isCurrent = index === last;
        return (
          <Node
            key={`${item.at}-${index}`}
            icon={iconForAction(item.action)}
            current={isCurrent}
            // The rail keeps going while anything is drawn below — the current
            // node is only the end of the line when nothing is still to come.
            rail={!isCurrent || future.length > 0}
            title={item.summary}
            caption={`${formatDateTime(item.at)}${item.user_name ? ` · ${item.user_name}` : ''}`}
            hint={item.reason ?? undefined}
          />
        );
      })}

      {future.map((node, index) => (
        <Node
          key={node.key}
          icon={node.icon}
          dim
          rail={index < future.length - 1}
          title={node.label}
          caption={node.hint}
        />
      ))}
    </View>
  );
}

type NodeProps = {
  icon: LucideIcon;
  title: string;
  caption?: string;
  hint?: string;
  /** The newest event — haloed as where the order stands right now. */
  current?: boolean;
  /** A step not reached yet: the whole node at 45 %. */
  dim?: boolean;
  rail?: boolean;
};

function Node({ icon, title, caption, hint, current, dim, rail }: NodeProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, dim ? styles.future : null]}>
      <View style={styles.discCol}>
        <View style={current ? [styles.halo, selectionHalo(theme.colors.page, theme.colors.dim)] : null}>
          <IconDisc icon={icon} size={CONTROL.timelineDisc} color={current ? theme.colors.text : theme.colors.muted} />
        </View>
        {rail ? <View style={[styles.rail, { backgroundColor: theme.colors.dim }]} /> : null}
      </View>
      <View style={styles.content}>
        <Text variant="rowStrong" color={dim ? 'muted' : undefined}>{title}</Text>
        {caption ? (
          <Text variant="caption" color="muted">{caption}</Text>
        ) : null}
        {hint ? (
          <Text variant="caption" color="muted" style={styles.reason}>{hint}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  future: { opacity: TIMELINE_FUTURE_OPACITY },
  discCol: { width: CONTROL.timelineDisc, alignItems: 'center' },
  halo: { borderRadius: radius.pill },
  rail: { flex: 1, width: 2, marginVertical: space[1] },
  content: { flex: 1, paddingBottom: space[4], gap: space[1] - 2 },
  reason: { marginTop: space[1] },
});
