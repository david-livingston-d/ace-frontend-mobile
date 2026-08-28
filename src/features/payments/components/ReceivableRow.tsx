import React from 'react';
import { RowCard, StatusChip, type MetricItem } from '@/ui';
import { formatMoney } from '@/lib/format/money';
import { cmpMoney } from '@/lib/sales/calc';

export type ReceivableRowProps = {
  customerName: string;
  /** Summed invoice `net` across this customer's open invoices. */
  billed: string;
  /** Summed `paid_amount` across those same invoices. */
  paid: string;
  outstanding: string;
  /** Zero (`'0.00'`) when nothing this customer owes is past due — the
   * overdue clause is then simply left off the subtitle. */
  overdue: string;
  invoices: number;
  onPress?: () => void;
};

/**
 * One grouped row of the "By customer" view (`payments-by-customer` frame) —
 * `groupReceivables` has already collapsed every open invoice down to these
 * facts per customer. A lifted `RowCard` like every other document list, with
 * the money in the metrics strip and an overdue/unpaid/settled badge beside
 * the name.
 */
export function ReceivableRow({ customerName, billed, paid, outstanding, overdue, invoices, onPress }: ReceivableRowProps) {
  const invoiceWord = invoices === 1 ? 'invoice' : 'invoices';
  const isOverdue = cmpMoney(overdue, '0') > 0;
  const subtitle = isOverdue
    ? `${invoices} ${invoiceWord} · overdue ${formatMoney(overdue)}`
    : `${invoices} ${invoiceWord}`;

  const metrics: MetricItem[] = [
    { label: 'Billed', value: formatMoney(billed) },
    { label: 'Paid', value: formatMoney(paid) },
    {
      label: 'Outstanding',
      value: formatMoney(outstanding),
      tone: cmpMoney(outstanding, '0') > 0 ? 'danger' : undefined,
    },
  ];

  return (
    <RowCard
      title={customerName}
      badges={
        <StatusChip
          tone={isOverdue ? 'danger' : cmpMoney(outstanding, '0') > 0 ? 'neutral' : 'success'}
          label={isOverdue ? 'Overdue' : cmpMoney(outstanding, '0') > 0 ? 'Unpaid' : 'Settled'}
          size="sm"
        />
      }
      meta={subtitle}
      metrics={metrics}
      onPress={onPress}
    />
  );
}
