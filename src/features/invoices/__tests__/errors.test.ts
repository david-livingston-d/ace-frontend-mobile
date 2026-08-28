import { AxiosError, AxiosHeaders } from 'axios';
import { getBillingErrorMessage } from '@/lib/billing/errors';

/** A 422 the billing endpoints actually return: `{detail: {code, message, …}}`. */
function apiError(detail: Record<string, unknown>, status = 422): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    data: { detail },
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return err;
}

test('dn_not_eligible names the note it was about', () => {
  // Three notes on screen and "a note isn't eligible" leaves the rep guessing
  // which one to clear — so the number the server sent is prefixed.
  const message = getBillingErrorMessage(apiError({
    code: 'dn_not_eligible',
    message: 'Delivery note DN-26-27-000007 is delivered and already invoiced',
    dn_number: 'DN-26-27-000007',
  }));
  expect(message).toContain('DN-26-27-000007');
  expect(message).toContain("can't be invoiced");
});

test('dn_not_eligible without a dn_number still reads as a sentence', () => {
  expect(getBillingErrorMessage(apiError({ code: 'dn_not_eligible', message: 'nope' }))).toBe(
    "That delivery note can't be invoiced — it is no longer delivered-and-unbilled. Reload the page.",
  );
});

test('the billing vocabulary covers the invoice-side codes', () => {
  expect(getBillingErrorMessage(apiError({ code: 'dn_not_in_order', message: '' }))).toBe(
    'That delivery note belongs to a different order — reload the page.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'lines_required', message: '' }))).toBe(
    'Select at least one delivery note to invoice.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'future_date', message: '' }))).toBe(
    "An invoice can't be dated in the future.",
  );
  expect(getBillingErrorMessage(apiError({ code: 'invoice_date_before_delivery', message: '' }))).toBe(
    "An invoice can't be dated before the goods left — use the last delivery date or later.",
  );
  expect(getBillingErrorMessage(apiError({ code: 'due_date_before_invoice_date', message: '' }))).toBe(
    'Due date cannot be before the invoice date.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'state_code_missing', message: '' }))).toContain(
    'GST state code is missing',
  );
  expect(getBillingErrorMessage(apiError({ code: 'not_draft', message: '' }))).toBe(
    'Only a draft invoice can be edited or refreshed — reload the page.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'not_submitted', message: '' }))).toBe(
    'Only a submitted invoice has an e-invoice payload — it needs a number first.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'has_allocations', message: '' }))).toBe(
    'A payment is allocated to this invoice — un-allocate or cancel it first.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'already_cancelled', message: '' }))).toBe(
    'This invoice is already cancelled.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'invalid_status', message: '' }))).toBe(
    "That status isn't one this record accepts.",
  );
  expect(getBillingErrorMessage(apiError({ code: 'einvoice_misconfigured', message: '' }))).toContain(
    'No e-invoice provider is configured',
  );
  expect(getBillingErrorMessage(apiError({ code: 'not_found', message: '' }, 404))).toBe(
    'That invoice no longer exists — it may have been removed.',
  );
  expect(getBillingErrorMessage(apiError({ code: 'forbidden', message: '' }, 403))).toBe(
    "You don't have permission to do that.",
  );
});

test('a note-side code falls through to the delivery vocabulary', () => {
  // `mixed_dispatch_warehouse` is raised while selecting notes, and its copy
  // lives with the delivery codes — same fallback chain as the web's
  // `getBillingErrorMessage`.
  expect(getBillingErrorMessage(apiError({ code: 'mixed_dispatch_warehouse', message: '' }))).toBe(
    "These notes were dispatched under different GSTINs, so they can't share one invoice.",
  );
});

test('an order-side code falls through to the sales vocabulary', () => {
  expect(getBillingErrorMessage(apiError({ code: 'invalid_phase', message: '' }))).toContain(
    "isn't at a phase that can be delivered from",
  );
});

test('an unmapped code keeps the server’s own message rather than inventing one', () => {
  expect(getBillingErrorMessage(apiError({ code: 'some_new_code', message: 'Server said so' }))).toBe('Server said so');
});
