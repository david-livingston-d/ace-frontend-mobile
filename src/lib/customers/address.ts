// Ported from ace-frontend-web/src/components/sales/address-picker.tsx:7-43
// (formatAddress, formatAddressSnapshot, defaultAddressId) — pure logic only,
// the picker component itself stays on web.
import type { Schemas } from '@/lib/api/types';

export type Address = Schemas['AddressOut'];

/** `line1, line2, city, state — pincode` with the blanks left out. */
export function formatAddress(address: Address): string {
  return [address.line1, address.line2, address.city, address.state]
    .filter(Boolean)
    .join(', ')
    .concat(address.pincode ? ` — ${address.pincode}` : '');
}

/** The address a snapshot (`billing_address`/`shipping_address` jsonb) describes. */
export function formatAddressSnapshot(snapshot: Record<string, unknown>): string {
  const parts = ['line1', 'line2', 'city', 'state']
    .map((key) => snapshot[key])
    .filter((part): part is string => typeof part === 'string' && part.length > 0);
  const pincode = typeof snapshot.pincode === 'string' ? snapshot.pincode : '';
  return parts.join(', ').concat(pincode ? ` — ${pincode}` : '');
}

/**
 * The customer's default address for one side of the document, or the first one
 * that can serve that side — the same fallback the API applies when the field is
 * omitted, so what the form shows is what the server would have chosen anyway.
 */
export function defaultAddressId(addresses: Address[], side: 'billing' | 'shipping'): string {
  const flag = side === 'billing' ? 'is_default_billing' : 'is_default_shipping';
  const preferred = addresses.find((address) => address[flag]);
  if (preferred) return preferred.id;
  const usable = addresses.find((address) => address.type === side || address.type === 'both');
  return usable?.id ?? addresses[0]?.id ?? '';
}
