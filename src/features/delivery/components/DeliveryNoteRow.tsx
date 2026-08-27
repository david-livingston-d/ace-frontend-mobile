import React from 'react';
import { ListRow, StatusChip } from '@/ui';
import { formatDate } from '@/lib/format/date';
import { dnStatusLabel, dnStatusTone } from '@/lib/sales/status';
import type { DeliveryNoteSummary } from '@/lib/api/types';

export type DeliveryNoteRowProps = {
  dn: DeliveryNoteSummary;
  onPress: () => void;
};

/** One delivery note as the order detail's Delivery section lists it — used
 * by `DeliverySection`, and by any future delivery-notes register that wants
 * the same row. */
export function DeliveryNoteRow({ dn, onPress }: DeliveryNoteRowProps) {
  return (
    <ListRow
      title={dn.number}
      subtitle={`${dn.qty_total} units · ${formatDate(dn.dn_date)}`}
      right={<StatusChip tone={dnStatusTone(dn.status)} label={dnStatusLabel(dn.status)} size="sm" />}
      onPress={onPress}
      chevron
    />
  );
}
