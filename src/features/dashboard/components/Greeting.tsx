import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { istNow } from '@/lib/format/date';
import type { TabParamList } from '@/navigation/types';

export type GreetingProps = { name?: string | null };

function firstNameOf(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] ?? '';
}

function initialsOf(name?: string | null): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Greeting({ name }: GreetingProps) {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  // `istNow()` yields a Date whose *UTC* fields are the IST wall-clock reading (see
  // lib/format/date.ts). Only the calendar fields (weekday/day/month/year) matter for
  // this label, so they're copied onto a local-midnight Date before formatting — that
  // keeps date-fns' `format` (which reads local getters) from re-applying the device's
  // own timezone on top and shifting the day.
  const now = istNow();
  const calendarDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return (
    <View style={styles.row}>
      <View>
        <Text variant="h3">Hi {firstNameOf(name)}</Text>
        <Text variant="bodySm" color="textMuted">{format(calendarDate, 'EEE, d MMM yyyy')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={() => navigation.navigate('More')}
        style={[styles.avatar, { backgroundColor: theme.colors.inverseBg }]}
      >
        <Text variant="label" color={theme.colors.inverseText}>{initialsOf(name)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3] },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
