import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { format } from 'date-fns';
import { Text, useTheme } from '@/ui';
import { n } from '@/ui/tokens/colors';
import { space } from '@/ui/tokens/spacing';
import { todayIso } from '@/lib/format/date';
import type { DashboardSalesOut } from '../types';

export type Last7DaysChartProps = { days: DashboardSalesOut['last_7_days'] };

const CHART_HEIGHT = 64;
const BAR_WIDTH = 20;

// Each `date` is a pure calendar string ('YYYY-MM-DD'); a weekday label only
// depends on the calendar date, not on any instant, so parsing it straight
// into a local-midnight Date (rather than through `parseISO` + an IST shift)
// is timezone-safe on its own — no device-timezone re-application risk here.
function localCalendarDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

// Hidden entirely when `last_7_days` is empty (e.g. a scope with no order history).
export function Last7DaysChart({ days }: Last7DaysChartProps) {
  const theme = useTheme();
  if (days.length === 0) return null;

  const today = todayIso();
  const maxOrders = Math.max(...days.map((d) => d.orders), 1);
  const barColor = theme.mode === 'dark' ? n[700] : n[300];

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="textMuted">LAST 7 DAYS</Text>
      <View style={styles.row}>
        {days.map((day) => {
          const isToday = day.date === today;
          const barHeight = day.orders === 0 ? 2 : Math.max(4, Math.round((day.orders / maxOrders) * CHART_HEIGHT));
          return (
            <View key={day.date} style={styles.col}>
              <Svg width={BAR_WIDTH} height={CHART_HEIGHT}>
                <Rect
                  x={0}
                  y={CHART_HEIGHT - barHeight}
                  width={BAR_WIDTH}
                  height={barHeight}
                  rx={4}
                  fill={isToday ? theme.colors.text : barColor}
                />
              </Svg>
              <Text variant="caption" color="textSubtle" style={styles.label}>
                {isToday ? 'Today' : format(localCalendarDate(day.date), 'EEE')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space[4] },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] },
  col: { alignItems: 'center', gap: space[1] },
  label: { marginTop: space[1] },
});
