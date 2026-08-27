import React from 'react';
import { Text, ListRow } from '@/ui';
import { formatMoney } from '@/lib/format/money';
import { cmpMoney } from '@/lib/sales/calc';

export type ReceivableRowProps = {
  customerName: string;
  outstanding: string;
  /** Zero (`'0.00'`) when nothing this customer owes is past due — the
   * overdue clause is then simply left off the subtitle. */
  overdue: string;
  invoices: number;
  onPress?: () => void;
};

/** One grouped row of the "By customer" view — `PaymentsTabScreen.groupReceivables`
 * already collapsed every open invoice down to these four facts per customer. */
export function ReceivableRow({ customerName, outstanding, overdue, invoices, onPress }: ReceivableRowProps) {
  const invoiceWord = invoices === 1 ? 'invoice' : 'invoices';
  const subtitle = cmpMoney(overdue, '0') > 0
    ? `${invoices} ${invoiceWord} · overdue ${formatMoney(overdue)}`
    : `${invoices} ${invoiceWord}`;
  return (
    <ListRow
      title={customerName}
      subtitle={subtitle}
      right={<Text variant="body">{formatMoney(outstanding)}</Text>}
      onPress={onPress}
      chevron={!!onPress}
    />
  );
}
