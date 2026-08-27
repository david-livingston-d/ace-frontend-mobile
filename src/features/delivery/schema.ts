import type { DeliveryNoteIn } from './types';

/**
 * `RecordDeliveryScreen`'s per-line stepper state -> the wire body. A line the
 * user zeroed out (or that was disabled at `eligible: '0'` to begin with)
 * never appears on the request — the backend's own `lines_required` 422
 * reads as "nothing was submitted", so an all-zero cart should never reach
 * it, but a partial cart's zero lines are just as meaningless to send.
 *
 * `qty` goes over the wire as a string (`qty: number | string` in the
 * generated schema) — every other quantity in this app is a decimal string
 * end to end, and a `Stepper`'s in-memory `number` is only ever a display/edit
 * convenience.
 */
export function buildDeliveryNoteIn({
  dnDate,
  qtyByLine,
  remarks,
}: {
  dnDate: string;
  qtyByLine: Record<string, number>;
  remarks: string;
}): DeliveryNoteIn {
  const lines = Object.entries(qtyByLine)
    .filter(([, qty]) => qty > 0)
    .map(([so_line_id, qty]) => ({ so_line_id, qty: String(qty) }));
  return { dn_date: dnDate, lines, remarks: remarks.trim() || null };
}
