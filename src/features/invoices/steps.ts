/**
 * `invoices.status` collapsed to the `StepBar`'s two-step Created→Submitted
 * track. Read off the document's real `status` (Global Constraints: "server is
 * the authority for multi-step flows"), never guessed forward by the client —
 * a submit that failed halfway leaves the invoice a draft, and the bar says so.
 * A cancelled invoice, like a cancelled note or order, keeps no record of how
 * far it got, so it fails at step 0 rather than inventing a position.
 */
export const INVOICE_STEPS = ['Created', 'Submitted'];

export function invoiceStep(status: string): { current: number; label: string; failed: boolean } {
  switch (status) {
    case 'draft':
      return { current: 0, label: 'Created', failed: false };
    case 'submitted':
      return { current: 1, label: 'Submitted', failed: false };
    case 'cancelled':
      return { current: 0, label: 'Cancelled', failed: true };
    default:
      return { current: 0, label: status, failed: false };
  }
}

/**
 * The invoice detail's CONTINUE action: what the *next* step is called, the
 * permission code it needs, and whether this viewer holds it.
 *
 * `enabled` rather than simply returning `null` without the permission: the
 * step bar greys CONTINUE out with a plain-English hint instead of hiding it,
 * so a rep who cannot submit still sees *what* would move this invoice along
 * (the same contract `DeliveryStepBar`/`PaymentStepBar` already have — they
 * take that decision as a prop; this returns it, because `can` is the only
 * thing an invoice's next step depends on beyond its status).
 *
 * Submitted is the end of the track: paying an invoice is a *different*
 * document, offered as its own action rather than as a third step.
 */
export function invoiceNextAction(
  invoice: { status: string },
  can: (code: string) => boolean,
): { label: string; permission: string; enabled: boolean } | null {
  if (invoice.status !== 'draft') return null;
  const permission = 'invoice.submit';
  return { label: 'Submit', permission, enabled: can(permission) };
}
