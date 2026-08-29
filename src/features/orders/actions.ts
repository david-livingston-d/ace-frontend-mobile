import { isOpenPhase } from '@/lib/sales/status';

export type Action = 'edit' | 'verify' | 'cancel' | 'recordDelivery' | 'createInvoice' | 'recordPayment' | 'pdf';

/**
 * Whether this order still has a *delivered* note that no live invoice claims
 * — PRD §21's whole-DN rule, decided from the order detail payload alone.
 *
 * The payload does not say which notes each invoice took (neither
 * `DeliveryNoteSummaryOut` nor `InvoiceSummaryOut` carries the link), so this
 * reads the two signals it does have:
 *
 *  - a **submitted** invoice moves each order line's `invoiced_qty`, so
 *    `invoiceable_qty` (`delivered_qty - invoiced_qty`, sales/service.py) is an
 *    exact test for everything already billed;
 *  - a **draft** invoice moves no quantity at all, and claims at least one
 *    note — so drafts are counted note-for-draft against the delivered ones.
 *
 * That is necessary, and sufficient in every case a rep meets in practice; the
 * one it can over-report is a single draft invoice holding two delivered notes.
 * The screen behind the action re-asks the server (`GET …/invoiceable`), which
 * is the authority, and shows its empty state when there is nothing left.
 */
function hasUnclaimedDeliveredNote({
  lines,
  deliveryNotes,
  invoices,
}: {
  lines: { invoiceable_qty?: string }[];
  deliveryNotes: { status: string }[];
  invoices: { status: string }[];
}): boolean {
  const delivered = deliveryNotes.filter((dn) => dn.status === 'delivered').length;
  if (delivered === 0) return false;
  if (!lines.some((l) => Number(l.invoiceable_qty ?? '0') > 0)) return false;
  const drafts = invoices.filter((inv) => inv.status === 'draft').length;
  return delivered > drafts;
}

/**
 * The order-detail sticky action bar's whole permission/phase matrix, kept as
 * one pure function so it's unit-testable without mounting the screen (see
 * `__tests__/actions.table.test.ts`). `lines` needs `deliverable` (a delivery
 * can only be recorded once at least one line still has something to ship) and
 * `invoiceable_qty` (see `hasUnclaimedDeliveredNote`).
 */
export function visibleActions({
  phase,
  lines,
  deliveryNotes = [],
  invoices = [],
  can,
}: {
  phase: string;
  lines: { deliverable: string; invoiceable_qty?: string }[];
  deliveryNotes?: { status: string }[];
  invoices?: { status: string }[];
  can: (code: string) => boolean;
}): Action[] {
  const out: Action[] = [];
  if (phase === 'draft') {
    if (can('sales_order.update')) out.push('edit');
    if (can('sales_order.verify')) out.push('verify');
    if (can('sales_order.cancel')) out.push('cancel');
  } else if (isOpenPhase(phase)) {
    if (can('delivery_note.create') && lines.some((l) => Number(l.deliverable) > 0)) out.push('recordDelivery');
    // Both codes, not just `invoice.create`: the screen behind this button
    // opens on `GET …/invoiceable`, which the API guards with `invoice.read`,
    // so a create-without-read grant would land the rep on a 403 error state.
    if (
      can('invoice.create') &&
      can('invoice.read') &&
      hasUnclaimedDeliveredNote({ lines, deliveryNotes, invoices })
    ) {
      out.push('createInvoice');
    }
    if (can('payment.create')) out.push('recordPayment');
  }
  if (can('sales_order.read')) out.push('pdf');
  return out;
}

/** Every action except the PDF glyph — the ones that render as a text pill. */
export type TextAction = Exclude<Action, 'pdf'>;

/**
 * Which action outranks which in the bar, most important first.
 *
 * Explicit, because the alternative is *declaration* order — and
 * `visibleActions` builds its list phase by phase, so what happened to be last
 * in a phase's block decided what got demoted. The order below is the owner's
 * (canvas edit #7) and the rep's: the action that moves the order along
 * outranks the money one, which outranks the paperwork, which outranks a
 * correction, which outranks the destructive one. Draft therefore reads
 * verify -> edit -> cancel and an open order recordDelivery -> recordPayment ->
 * createInvoice; the two phases never mix, so one list serves both.
 */
export const PRIORITY: TextAction[] = [
  'verify',
  'recordDelivery',
  'recordPayment',
  'createInvoice',
  'edit',
  'cancel',
];

/**
 * The bar has exactly **one** solid button. These are the actions that move the
 * order forward, so one of them is the primary whenever it is on offer: an open
 * order can offer both "Record delivery" and "Create invoice" (partly shipped,
 * partly delivered) and two solid pills side by side would say neither is the
 * thing to do — shipping the goods stays primary and invoicing falls back to
 * outline. When the order offers no promoting action at all (payment only, edit
 * only), the highest-priority action present takes the solid fill rather than
 * leaving the bar as a lone outline pill that reads as disabled.
 */
const PROMOTING: TextAction[] = ['verify', 'recordDelivery', 'createInvoice'];

/** Canvas edit #7: up to three text buttons in the first row. */
const MAX_PER_ROW = 3;

export type ActionRows = {
  /** The bar's one row, already in the order it is drawn, primary first. */
  firstRow: TextAction[];
  /** Only non-empty when the phase offers more than `MAX_PER_ROW` text actions. */
  overflow: TextAction[];
  /** The single solid button, or `null` when there is nothing to draw. */
  primary: TextAction | null;
  /** Whether the row ends with the download glyph. */
  hasPdf: boolean;
};

/**
 * Split the visible actions into the bar's rows (canvas edit #7).
 *
 * One row of at most three no-wrap text buttons — primary at `flex: 1.5`, the
 * rest at `flex: 1` — followed by the PDF glyph, which is an icon and so does
 * **not** consume a text slot. A second row only appears when a phase genuinely
 * offers more than three text actions, because four pills in one row leave no
 * button wide enough to read.
 *
 * Pure and exported so the whole matrix is table-testable without mounting the
 * screen (see `__tests__/actions.table.test.ts`).
 */
export function splitRows(
  actions: Action[],
  { hasPdf = actions.includes('pdf') }: { hasPdf?: boolean } = {},
): ActionRows {
  const rank = (a: TextAction) => {
    const i = PRIORITY.indexOf(a);
    return i === -1 ? PRIORITY.length : i;
  };
  const ordered = actions
    .filter((a): a is TextAction => a !== 'pdf')
    .sort((a, b) => rank(a) - rank(b));
  const firstRow = ordered.slice(0, MAX_PER_ROW);
  const overflow = ordered.slice(MAX_PER_ROW);
  const primary = PROMOTING.find((a) => firstRow.includes(a)) ?? firstRow[0] ?? null;
  return { firstRow, overflow, primary, hasPdf };
}
