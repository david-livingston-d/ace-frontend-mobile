// The chip -> register-query-params map. M2's Orders list (and its filter
// sheet) extends this same table rather than inventing a second one.
export const ORDER_FILTER_PRESETS = {
  pendingDelivery: { pending: true },
  open: { open: true },
  overdue: { overdue: true },
  pendingPayment: { open: true, outstanding_only: true },
  pendingStockCheck: { phase: 'ready_for_stock_check' },
  pendingReserve: { open: true, reservation_status: 'partially_reserved' },
  closed: { phase: 'closed' },
  cancelled: { phase: 'cancelled' },
  stockShortage: { open: true, open_shortage: true },
} as const;

export type OrderPreset = keyof typeof ORDER_FILTER_PRESETS;

export function presetParams(preset: OrderPreset): Record<string, string | boolean> {
  return { ...ORDER_FILTER_PRESETS[preset] };
}

export type OrderFilters = {
  q?: string;
  preset?: OrderPreset;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  customerName?: string;
  salesUserId?: string;
  salesUserName?: string;
  openShortage?: boolean;
};

/** The register's default view is every unclosed order (`{ open: true }`) —
 * a preset overrides that base entirely rather than adding to it, since each
 * preset (e.g. `closed`) already encodes its own complete phase/status query. */
export function filtersToParams(f: OrderFilters): Record<string, string | number | boolean> {
  const base = f.preset ? presetParams(f.preset) : { open: true };
  const p: Record<string, string | number | boolean> = { ...base };
  if (f.q?.trim()) p.q = f.q.trim();
  if (f.dateFrom) p.date_from = f.dateFrom;
  if (f.dateTo) p.date_to = f.dateTo;
  if (f.customerId) p.customer_id = f.customerId;
  if (f.salesUserId) p.sales_user_id = f.salesUserId;
  // Only sent when true — the register endpoint treats an explicit `false`
  // the same as "don't care" today, so omitting it keeps a clean query string.
  if (f.openShortage) p.open_shortage = true;
  return p;
}

export const PRESET_LABELS: Record<OrderPreset, string> = {
  pendingDelivery: 'Pending delivery',
  open: 'Unclosed',
  overdue: 'Overdue',
  pendingPayment: 'Pending payments',
  pendingStockCheck: 'Pending stock check',
  pendingReserve: 'Pending reserve',
  closed: 'Closed',
  cancelled: 'Cancelled',
  stockShortage: 'Stock shortage',
};
