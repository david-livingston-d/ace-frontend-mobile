import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, EmptyState } from '@/ui';

export type PlaceholderScreenProps = {
  title: string;
  hint: string;
  icon: LucideIcon;
};

/** One generic "not built yet" screen for every root-stack route this task
 * only needs to register (not implement) — M3's writes (record delivery/
 * payment) and M3's real DN/payment detail screens. Keeps the header's back
 * button working and the route resolvable, without a bespoke file per route. */
export function PlaceholderScreen({ title, hint, icon }: PlaceholderScreenProps) {
  const navigation = useNavigation();
  return (
    <Screen title={title} back={() => navigation.goBack()}>
      <EmptyState icon={icon} title={title} hint={hint} />
    </Screen>
  );
}
