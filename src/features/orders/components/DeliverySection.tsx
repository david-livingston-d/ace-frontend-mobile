import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Banner } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatDate } from '@/lib/format/date';
import { DeliveryNoteRow } from '@/features/delivery/components/DeliveryNoteRow';
import type { DeliveryNoteSummary, Shortage } from '../types';

export type DeliverySectionProps = {
  deliveryNotes: DeliveryNoteSummary[];
  shortages: Shortage[];
  onOpenDn: (id: string) => void;
};

export function DeliverySection({ deliveryNotes, shortages, onOpenDn }: DeliverySectionProps) {
  const openShortages = shortages.filter((s) => s.status !== 'resolved');
  if (deliveryNotes.length === 0 && openShortages.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="h4">Delivery</Text>
      {deliveryNotes.map((dn) => (
        <DeliveryNoteRow key={dn.id} dn={dn} onPress={() => onOpenDn(dn.id)} />
      ))}
      {openShortages.map((s) => (
        <Banner
          key={s.id}
          tone="warning"
          title={`${s.sku ?? 'Line'} short by ${s.short_qty}`}
          body={s.expected_availability_date ? `Expected ${formatDate(s.expected_availability_date)}` : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ container: { marginTop: space[4], gap: space[2] } });
