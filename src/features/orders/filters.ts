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
} as const;

export type OrderPreset = keyof typeof ORDER_FILTER_PRESETS;

export function presetParams(preset: OrderPreset): Record<string, string | boolean> {
  return { ...ORDER_FILTER_PRESETS[preset] };
}
