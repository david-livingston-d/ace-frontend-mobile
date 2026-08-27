/**
 * Human copy for the permission a blocked next step needs.
 *
 * Permission *codes* are the contract between backend and client (CLAUDE.md:
 * "permission codes not role names"), so they are what `paymentNextAction` /
 * `deliveryNextAction` return — but a rep reading "Needs payment.allocate"
 * under a greyed-out button is being shown an internal identifier and told
 * nothing actionable. This maps each code a step bar can block on to a sentence
 * that says who unblocks it. Codes stay the source of truth; only the wording
 * lives here.
 */
export const PERMISSION_HINTS: Record<string, string> = {
  'payment.submit': 'Someone with payment approval rights needs to finish this',
  'payment.allocate': 'Someone with allocation rights needs to finish this',
  'delivery_note.submit': 'Someone with dispatch rights needs to finish this',
  'delivery_note.mark_delivered': 'Someone with dispatch rights needs to confirm delivery',
};

/** The fallback keeps an unmapped code from leaking into the UI: a step bar
 * blocked on a permission nobody wrote copy for still says something true. */
export const PERMISSION_HINT_FALLBACK = "You don't have permission for the next step";

export function permissionHint(code: string): string {
  return PERMISSION_HINTS[code] ?? PERMISSION_HINT_FALLBACK;
}
