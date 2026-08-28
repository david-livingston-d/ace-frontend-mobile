import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProgressBar, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';

export const PHASE_PROGRESS_STEPS = ['Created', 'Stock check', 'Reserved', 'Delivered', 'Invoiced', 'Paid', 'Closed'];

/**
 * `sales_orders.phase` + the invoice/payment status dimensions, collapsed to
 * one step index on the Created→Closed track. A cancelled order always fails
 * at step 0 — cancellation is draft-only in MVP (CLAUDE.md "Cancellation in
 * MVP: allowed only until draft state"), so nothing downstream ever ran. A
 * short-closed order can be reached much later (after partial delivery), so
 * its failed step is read off however far invoicing/payment actually got —
 * the two dimensions that still exist below its phase.
 */
export function phaseStep(
  phase: string,
  invoiceStatus: string,
  paymentStatus: string,
): { current: number; failed: boolean } {
  switch (phase) {
    case 'draft':
      return { current: 0, failed: false };
    case 'ready_for_stock_check':
      return { current: 1, failed: false };
    case 'partially_reserved':
    case 'fully_reserved':
      return { current: 2, failed: false };
    case 'partially_delivered':
    case 'fully_delivered':
      return { current: 3, failed: false };
    case 'payment_pending':
      return { current: 4, failed: false };
    case 'ready_to_close':
      return { current: 5, failed: false };
    case 'closed':
      return { current: 6, failed: false };
    case 'cancelled':
      return { current: 0, failed: true };
    case 'short_closed':
      if (paymentStatus === 'paid') return { current: 5, failed: true };
      if (invoiceStatus !== 'not_invoiced') return { current: 4, failed: true };
      return { current: 3, failed: true };
    default:
      return { current: 0, failed: false };
  }
}

export type PhaseProgressProps = {
  phase: string;
  invoiceStatus: string;
  paymentStatus: string;
  /** `cancel_reason`/`close_reason` — shown under the track once the phase failed. */
  reason?: string | null;
};

export function PhaseProgress({ phase, invoiceStatus, paymentStatus, reason }: PhaseProgressProps) {
  const { current, failed } = phaseStep(phase, invoiceStatus, paymentStatus);
  return (
    <View style={styles.container}>
      {/* Bare dots (`order-detail` frame): seven phase names do not fit a
          phone width, and the header card's badge already says which phase
          the order is in. */}
      <ProgressBar steps={PHASE_PROGRESS_STEPS} current={current} failed={failed} labels={false} />
      <Text variant="caption" color="muted" style={styles.caption}>
        {`Step ${current + 1} of ${PHASE_PROGRESS_STEPS.length} · ${PHASE_PROGRESS_STEPS[current] ?? ''}`}
      </Text>
      {failed && reason ? (
        <Text variant="bodySm" color="textMuted" style={styles.reason}>
          {reason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: space[3] },
  caption: { marginTop: space[2] },
  reason: { marginTop: space[2] },
});
