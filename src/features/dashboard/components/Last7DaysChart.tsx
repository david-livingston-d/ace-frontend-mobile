import React from 'react';
import { View, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Card, Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { controlRadius } from '@/ui/tokens/radius';
import { CHART } from '@/ui/tokens/layout';
import { shadow } from '@/ui/tokens/elevation';
import { todayIso } from '@/lib/format/date';
import type { DashboardSalesOut } from '../types';

export type Last7DaysChartProps = { days: DashboardSalesOut['last_7_days'] };

// Each `date` is a pure calendar string ('YYYY-MM-DD'); a weekday label only
// depends on the calendar date, not on any instant, so parsing it straight
// into a local-midnight Date (rather than through `parseISO` + an IST shift)
// is timezone-safe on its own — no device-timezone re-application risk here.
function localCalendarDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

/**
 * Seven bars in a card (`.chart`). Drawn as views rather than SVG so today's
 * bar can carry a real shadow: canvas edit #8 replaced the accent-yellow
 * "Today" bar with a *card-surfaced* one that is lifted and ringed — the
 * system has no accent colour, so emphasis is depth.
 *
 * Hidden entirely when `last_7_days` is empty (e.g. a scope with no history).
 */
export function Last7DaysChart({ days }: Last7DaysChartProps) {
  const theme = useTheme();
  if (days.length === 0) return null;

  const today = todayIso();
  const maxOrders = Math.max(...days.map((d) => d.orders), 1);

  return (
    <Card>
      <Text variant="label" color="muted">Last 7 days</Text>
      <View style={styles.plot}>
        {days.map((day) => {
          const isToday = day.date === today;
          // Never below `barMinHeight`: a zero day is still a day on the axis,
          // and a bar that disappears reads as missing data.
          const barHeight = Math.max(
            CHART.barMinHeight,
            Math.round((day.orders / maxOrders) * (CHART.height - CHART.barMinHeight)),
          );
          return (
            <View key={day.date} style={styles.col}>
              <View
                style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: isToday ? theme.colors.card : theme.colors.dim },
                  isToday ? shadow('raised', theme.mode, { color: theme.colors.ring }) : null,
                ]}
              />
              <Text variant="caption" color="muted" numberOfLines={1}>
                {isToday ? 'Today' : format(localCalendarDate(day.date), 'EEE')}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[2],
    marginTop: space[3],
  },
  col: { flex: 1, alignItems: 'center', gap: space[1] + 2 },
  bar: { width: CHART.barWidth, borderRadius: controlRadius.bar },
});
