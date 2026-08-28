import React from 'react';
import { RowCard, StatusChip } from '@/ui';
import { formatDate } from '@/lib/format/date';
import { formatQty } from '@/lib/format/qty';
import { dnStatusLabel, dnStatusTone } from '@/lib/sales/status';
import type { DeliveryNoteSummary } from '@/lib/api/types';

export type DeliveryNoteRowProps = {
  dn: DeliveryNoteSummary;
  onPress: () => void;
};

/** One delivery note as the order detail's Delivery section lists it — used
 * by `DeliverySection`, and by any future delivery-notes register that wants
 * the same row. The quantity goes through `formatQty`: `qty_total` arrives as
 * `numeric(14,3)`, and nobody in a warehouse says "7.000 units". */
export function DeliveryNoteRow({ dn, onPress }: DeliveryNoteRowProps) {
  const units = formatQty(dn.qty_total);
  return (
    <RowCard
      title={dn.number}
      badges={<StatusChip tone={dnStatusTone(dn.status)} label={dnStatusLabel(dn.status)} size="sm" />}
      meta={`${units} ${units === '1' ? 'unit' : 'units'} · ${formatDate(dn.dn_date)}`}
      onPress={onPress}
    />
  );
}
