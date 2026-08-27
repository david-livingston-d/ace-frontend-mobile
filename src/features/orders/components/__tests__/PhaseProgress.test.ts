import { phaseStep } from '@/features/orders/components/PhaseProgress';

test('open phases map to the created→closed step index, never failed', () => {
  expect(phaseStep('draft', 'not_invoiced', 'unpaid')).toEqual({ current: 0, failed: false });
  expect(phaseStep('ready_for_stock_check', 'not_invoiced', 'unpaid')).toEqual({ current: 1, failed: false });
  expect(phaseStep('partially_reserved', 'not_invoiced', 'unpaid')).toEqual({ current: 2, failed: false });
  expect(phaseStep('fully_reserved', 'not_invoiced', 'unpaid')).toEqual({ current: 2, failed: false });
  expect(phaseStep('partially_delivered', 'not_invoiced', 'unpaid')).toEqual({ current: 3, failed: false });
  expect(phaseStep('fully_delivered', 'not_invoiced', 'unpaid')).toEqual({ current: 3, failed: false });
  expect(phaseStep('payment_pending', 'fully_invoiced', 'partially_paid')).toEqual({ current: 4, failed: false });
  expect(phaseStep('ready_to_close', 'fully_invoiced', 'paid')).toEqual({ current: 5, failed: false });
  expect(phaseStep('closed', 'fully_invoiced', 'paid')).toEqual({ current: 6, failed: false });
});

test('cancelled always fails at step 0 — cancellation is draft-only (PRD/CLAUDE.md)', () => {
  expect(phaseStep('cancelled', 'not_invoiced', 'unpaid')).toEqual({ current: 0, failed: true });
});

test('short_closed fails at the furthest step its own status dimensions reached', () => {
  expect(phaseStep('short_closed', 'not_invoiced', 'unpaid')).toEqual({ current: 3, failed: true });
  expect(phaseStep('short_closed', 'partially_invoiced', 'unpaid')).toEqual({ current: 4, failed: true });
  expect(phaseStep('short_closed', 'fully_invoiced', 'paid')).toEqual({ current: 5, failed: true });
});

test('unknown phase falls back to step 0, not failed', () => {
  expect(phaseStep('some_future_phase', 'not_invoiced', 'unpaid')).toEqual({ current: 0, failed: false });
});
