import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ListRow, Banner } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatDate } from '@/lib/format/date';
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
        <ListRow
          key={dn.id}
          title={dn.number}
          subtitle={`${dn.qty_total} units · ${formatDate(dn.dn_date)} · ${dn.status}`}
          onPress={() => onOpenDn(dn.id)}
          chevron
        />
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
