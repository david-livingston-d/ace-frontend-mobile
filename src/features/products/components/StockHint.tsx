import React from 'react';
import { StatusChip } from '@/ui';
import { stockHint } from '../stock';
import type { StockSummary } from '../types';

export type StockHintProps = { stock: StockSummary | null };

export function StockHint({ stock }: StockHintProps) {
  const hint = stockHint(stock);
  return <StatusChip tone={hint.tone} label={hint.label} size="sm" />;
}
