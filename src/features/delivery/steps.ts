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
