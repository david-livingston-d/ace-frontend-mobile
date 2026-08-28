/**
 * `delivery_notes.status` collapsed to the `StepBar`'s three-step
 * Created→Submitted→Delivered track (Global Constraints: "Server is the
 * authority for multi-step flows" — the step shown is always read off the
 * document's real `status`, never guessed forward by the client). Ported in
 * spirit from `PhaseProgress.phaseStep` — a cancelled note has no "how far it
 * got" to recover from a bare status string, so (like a cancelled order) it
 * always fails at step 0 rather than guessing.
 */
export const DELIVERY_STEPS = ['Created', 'Submitted', 'Delivered'];

export function deliveryStep(status: string): { current: number; label: string; failed: boolean } {
  switch (status) {
    case 'draft':
      return { current: 0, label: 'Created', failed: false };
    case 'submitted':
      return { current: 1, label: 'Submitted', failed: false };
    case 'delivered':
      return { current: 2, label: 'Delivered', failed: false };
    case 'cancelled':
      return { current: 0, label: 'Cancelled', failed: true };
    default:
      return { current: 0, label: status, failed: false };
  }
}

/**
 * The DN detail's CONTINUE action: which permission the *next* step needs,
 * and what to call the button — `null` once there is no next step (delivered
 * or cancelled). Kept separate from `deliveryStep` so the pure status→step
 * mapping above stays a plain lookup table.
 */
export function deliveryNextAction(status: string): { label: string; permission: string } | null {
  if (status === 'draft') return { label: 'Submit', permission: 'delivery_note.submit' };
  if (status === 'submitted') return { label: 'Mark delivered', permission: 'delivery_note.mark_delivered' };
  return null;
}

/**
 * The delivered note's *next document*, not its next status: whole-DN
 * invoicing (PRD §21). Deliberately separate from `deliveryNextAction` above,
 * so the note's own Created→Submitted→Delivered track still ends at Delivered
 * — an invoice is a different document with its own lifecycle, offered as the
 * detail's primary action rather than smuggled in as a fourth step.
 *
 * `null` once the note is already claimed by a live (draft or submitted)
 * invoice; a cancelled invoice releases its notes, so that one does not count.
 *
 * `permissions` (plural, and *all* of them required) rather than the single
 * `permission` a status step carries: the create screen this leads to opens on
 * `GET …/invoiceable`, which the API guards with `invoice.read`, so the button
 * needs both codes or it would only ever reach a 403.
 */
export function deliveryInvoiceAction(dn: {
  status: string;
  invoice?: { status: string } | null;
}): { label: string; permissions: string[] } | null {
  if (dn.status !== 'delivered') return null;
  if (dn.invoice && dn.invoice.status !== 'cancelled') return null;
  return { label: 'Create invoice', permissions: ['invoice.create', 'invoice.read'] };
}
