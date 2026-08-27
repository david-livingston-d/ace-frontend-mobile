// Ported verbatim from ace-frontend-web/src/lib/sales.ts (lines 63-232): the
// phase/status vocabulary. `StatusTone` comes from the mobile UI tokens
// instead of the web's status-chip component — same five-tone type either way.
import type { StatusTone } from '@/ui/tokens/colors';

/**
 * `sales_orders.phase` (models.PHASES). Phases beyond S3 are listed because the
 * column already accepts them — an order that reaches `partially_delivered` in
 * S4 must not render as a raw enum value on a page shipped in S3.
 */
const PHASE_LABELS: Record<string, string> = {
  draft: 'Draft',
  ready_for_stock_check: 'Ready for stock check',
  partially_reserved: 'Partially reserved',
  fully_reserved: 'Fully reserved',
  partially_delivered: 'Partially delivered',
  fully_delivered: 'Fully delivered',
  payment_pending: 'Payment pending',
  ready_to_close: 'Ready to close',
  closed: 'Closed',
  short_closed: 'Short closed',
  cancelled: 'Cancelled',
};

export const PHASES = Object.keys(PHASE_LABELS);

export function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
}

/**
 * Phases on the shared five-tone vocabulary: nothing committed yet is plain,
 * work in flight is info, a finished order success, and a cancelled or
 * short-closed one danger/warning. No phase invents a colour of its own.
 */
const PHASE_TONES: Record<string, StatusTone> = {
  draft: 'neutral',
  ready_for_stock_check: 'info',
  partially_reserved: 'info',
  fully_reserved: 'info',
  partially_delivered: 'info',
  fully_delivered: 'success',
  payment_pending: 'warning',
  ready_to_close: 'success',
  closed: 'success',
  short_closed: 'warning',
  cancelled: 'danger',
};

export function phaseTone(phase: string): StatusTone {
  return PHASE_TONES[phase] ?? 'neutral';
}

/**
 * The four independent status dimensions (PRD §20). Each is derived, never set
 * by hand, and each filters on its own — so they share one shape here: label,
 * tone, and the vocabulary the filter selects from.
 */
type Dimension = {
  label: string;
  values: Record<string, { label: string; tone: StatusTone }>;
};

const DIMENSIONS = {
  reservation_status: {
    label: 'Reservation',
    values: {
      not_reserved: { label: 'Not reserved', tone: 'neutral' },
      partially_reserved: { label: 'Partially reserved', tone: 'warning' },
      fully_reserved: { label: 'Fully reserved', tone: 'success' },
      released: { label: 'Released', tone: 'neutral' },
    },
  },
  delivery_status: {
    label: 'Delivery',
    values: {
      not_delivered: { label: 'Not delivered', tone: 'neutral' },
      partially_delivered: { label: 'Partially delivered', tone: 'warning' },
      fully_delivered: { label: 'Fully delivered', tone: 'success' },
    },
  },
  invoice_status: {
    label: 'Invoice',
    values: {
      not_invoiced: { label: 'Not invoiced', tone: 'neutral' },
      partially_invoiced: { label: 'Partially invoiced', tone: 'warning' },
      fully_invoiced: { label: 'Fully invoiced', tone: 'success' },
    },
  },
  payment_status: {
    label: 'Payment',
    values: {
      unpaid: { label: 'Unpaid', tone: 'neutral' },
      partially_paid: { label: 'Partially paid', tone: 'warning' },
      paid: { label: 'Paid', tone: 'success' },
    },
  },
} satisfies Record<string, Dimension>;

export type DimensionKey = keyof typeof DIMENSIONS;

export const DIMENSION_KEYS: DimensionKey[] = [
  'reservation_status',
  'delivery_status',
  'invoice_status',
  'payment_status',
];

export function dimensionLabel(key: DimensionKey): string {
  return DIMENSIONS[key].label;
}

export function dimensionValues(key: DimensionKey): string[] {
  return Object.keys(DIMENSIONS[key].values);
}

/**
 * One status within a dimension. The widening to `Record<string, …>` is
 * deliberate: `value` is whatever the API sent, which may be a vocabulary entry
 * this build predates — so the lookup has to be able to miss, and fall back.
 */
function statusEntry(key: DimensionKey, value: string) {
  const values: Record<string, { label: string; tone: StatusTone }> = DIMENSIONS[key].values;
  return values[value];
}

export function statusLabel(key: DimensionKey, value: string): string {
  return statusEntry(key, value)?.label ?? value;
}

export function statusTone(key: DimensionKey, value: string): StatusTone {
  return statusEntry(key, value)?.tone ?? 'neutral';
}

const RESERVATION_DOC_TONES: Record<string, StatusTone> = {
  active: 'info',
  released: 'neutral',
  consumed: 'success',
};

const RESERVATION_DOC_LABELS: Record<string, string> = {
  active: 'Active',
  released: 'Released',
  consumed: 'Consumed',
};

export function reservationDocLabel(status: string): string {
  return RESERVATION_DOC_LABELS[status] ?? status;
}

export function reservationDocTone(status: string): StatusTone {
  return RESERVATION_DOC_TONES[status] ?? 'neutral';
}

export function shortageLabel(status: string): string {
  return status === 'resolved' ? 'Resolved' : 'Open';
}

export function shortageTone(status: string): StatusTone {
  return status === 'resolved' ? 'success' : 'warning';
}

/** Phases at which an order is still open work — no longer editable, not yet done. */
export function isOpenPhase(phase: string): boolean {
  return phase !== 'cancelled' && phase !== 'closed' && phase !== 'short_closed';
}

/** `delivery_notes.status` (draft -> submitted -> delivered, or cancelled).
 * Nothing committed yet reads neutral, in-flight info, done success, and
 * cancelled danger — the same five-tone vocabulary as `PHASE_TONES` above. */
const DN_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const DN_STATUS_TONES: Record<string, StatusTone> = {
  draft: 'neutral',
  submitted: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

export function dnStatusLabel(status: string): string {
  return DN_STATUS_LABELS[status] ?? status;
}

export function dnStatusTone(status: string): StatusTone {
  return DN_STATUS_TONES[status] ?? 'neutral';
}

/** `invoices.status` (draft -> submitted, or cancelled — no "paid" status of
 * its own; payment progress is `payment_status` on the order, a separate
 * dimension). Supersedes `InvoicesSection`'s own local `invoiceStatusTone`. */
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  cancelled: 'Cancelled',
};

const INVOICE_STATUS_TONES: Record<string, StatusTone> = {
  draft: 'neutral',
  submitted: 'info',
  cancelled: 'danger',
};

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function invoiceStatusTone(status: string): StatusTone {
  return INVOICE_STATUS_TONES[status] ?? 'neutral';
}
