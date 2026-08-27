import { z } from 'zod';
import type { Schemas } from '@/lib/api/types';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Enter the customer name').max(200),
  customer_type_id: z.string().min(1, 'Pick a customer type'),
  mobile: z
    .string()
    .transform((s) => s.replace(/\s+/g, ''))
    .refine((s) => /^\d{10}$/.test(s), 'Enter a valid 10-digit mobile number'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((s) => !s || GSTIN.test(s), 'A GSTIN is 15 characters like 33AABCM2210P1ZK')
    .or(z.literal('')),
  line1: z.string().trim().min(1, 'Enter the address'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'Enter the city'),
  state: z.string().trim().min(1, 'Enter the state'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  payment_terms_id: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type CustomerForm = z.infer<typeof customerSchema>;

/** Every new customer is created with exactly one contact and one address —
 * the contact is the person filling in the form (marked primary), and the
 * address serves both billing and shipping (`type: 'both'`) until the
 * customer detail screen's future address management lets someone add more. */
export function toCustomerIn(f: CustomerForm): Schemas['CustomerIn'] {
  return {
    name: f.name,
    customer_type_id: f.customer_type_id,
    gstin: f.gstin || null,
    state: f.state,
    country: 'India',
    payment_terms_id: f.payment_terms_id || null,
    notes: f.notes || null,
    contacts: [{ name: f.name, mobile: f.mobile, email: f.email || null, is_primary: true }],
    addresses: [
      {
        type: 'both',
        line1: f.line1,
        line2: f.line2 || null,
        city: f.city,
        state: f.state,
        pincode: f.pincode,
        country: 'India',
        is_default_billing: true,
        is_default_shipping: true,
      },
    ],
  };
}
