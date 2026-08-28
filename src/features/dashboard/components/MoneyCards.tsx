import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from '@/ui';
import { gapGrid, space } from '@/ui/tokens/spacing';
import { combine, shadow, toneShadow } from '@/ui/tokens/elevation';
import { formatMoney, formatMoneyShort } from '@/lib/format/money';
import type { DashboardSalesOut } from '../types';

export type MoneyCardsProps = {
  collectedThisMonth: string;
  outstanding: DashboardSalesOut['outstanding'];
  /** M3 Task 4: the OUTSTANDING tile opens the Payments tab's "By customer"
   * view — omitted only in tests that don't care about the tap. */
  onPressOutstanding?: () => void;
};

/**
 * One money figure per note card (`home-head`'s second `.gr2`). The tone lives
 * in the number and in the card's own drop shadow — an outstanding balance
 * glows faintly red rather than sitting on a coloured slab.
 */
function MoneyCard({
  label,
  value,
  hint,
  danger,
  onPress,
}: {
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  // Composed onto whatever `shadow()` decided this platform can draw, never
  // onto the raw recipe: below Android 28 there is no `boxShadow` at all and
  // the `Card`'s gated hairline has to stand (same pattern as `KpiTile`).
  const base = shadow('note', theme.mode);
  const toned =
    danger && base.boxShadow ? { boxShadow: combine(base.boxShadow, toneShadow('danger', theme.mode)) } : null;

  const card = (
    <Card variant="note" style={[styles.card, toned]}>
      <Text variant="label" color="muted">{label}</Text>
      <Text variant="stat" color={danger ? theme.colors.tone.danger.fg : theme.colors.text} style={styles.value}>
        {value}
      </Text>
      <Text variant="caption" color="subtle">{hint}</Text>
    </Card>
  );

  if (!onPress) return card;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.cell}>
      {card}
    </Pressable>
  );
}

// HomeScreen only mounts this when `collected_this_month !== null` — i.e. the
// viewer has `payment.read` — per the backend's gating contract.
export function MoneyCards({ collectedThisMonth, outstanding, onPressOutstanding }: MoneyCardsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <MoneyCard
          label="Collected"
          value={formatMoneyShort(collectedThisMonth)}
          hint={`${formatMoney(collectedThisMonth)} this month`}
        />
      </View>
      {outstanding ? (
        <View style={styles.cell}>
          <MoneyCard
            label="Outstanding"
            value={formatMoneyShort(outstanding.total)}
            hint={`overdue ${formatMoney(outstanding.overdue)}`}
            danger
            onPress={onPressOutstanding}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: gapGrid },
  cell: { flex: 1 },
  card: { gap: space[1] - 3 },
  value: { marginTop: space[1] },
});
