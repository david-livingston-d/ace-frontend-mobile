import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Avatar, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { istNow } from '@/lib/format/date';
import type { TabParamList } from '@/navigation/types';

export type GreetingProps = { name?: string | null };

function firstNameOf(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] ?? '';
}

/**
 * The `home-exec` / `home-head` frames' first row: the identity disc, the
 * date, and the greeting — the date above the name, because the name is the
 * screen's title (`screenTitle`) and a title is never the second line.
 * Initials are `Avatar`'s own business now, not this component's.
 */
export function Greeting({ name }: GreetingProps) {
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={() => navigation.navigate('More')}
      >
        <Avatar name={name ?? '?'} />
      </Pressable>
      <View style={styles.text}>
        <Text variant="caption" color="muted">{format(calendarDate, 'EEE, d MMM yyyy')}</Text>
        <Text variant="screenTitle">Hi {firstNameOf(name)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  text: { flex: 1, gap: space[1] - 3 },
});
