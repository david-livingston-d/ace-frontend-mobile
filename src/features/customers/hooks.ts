import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { keys } from '@/lib/query/keys';
import { customersApi } from './api';
import { toCustomerIn, type CustomerForm } from './schema';
import type { CustomerOut, DuplicateMatch } from './types';

/** The customer register's search box debounces before it becomes a request —
 * same reasoning as `useOrders` (see its own comment). */
export function useCustomers({ q }: { q: string }) {
  const debouncedQ = useDebouncedValue(q, 300);
  const params = useMemo(() => {
    const p: Record<string, unknown> = { is_active: true };
    if (debouncedQ.trim()) p.q = debouncedQ.trim();
    return p;
  }, [debouncedQ]);
  return useInfiniteList<CustomerOut>({ path: '/customers', params });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: keys.customer(id), queryFn: () => customersApi.get(id) });
}

/** Both `customers.read` and `payment.read` are required server-side (it's
 * customer data *and* payment data) — the caller passes its own
 * `usePermission('payment.read')` as `enabled` so a viewer without it never
 * even fires the request (a bare default here would call that hook
 * conditionally, tripping the rules of hooks), and a stray 403 (should the
 * permission check race a stale `/auth/me`) still just resolves to `isError`
 * rather than throwing into a boundary. */
export function useCustomerFinancialSummary(id: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.customerFinancialSummary(id),
    queryFn: () => customersApi.financialSummary(id),
    enabled,
  });
}

export type CreateCustomerResult =
  | { kind: 'matches'; matches: DuplicateMatch[] }
  | { kind: 'created'; customer: CustomerOut };

/** Runs the duplicate check first (unless `force` — the "create anyway" path
 * after a warning was already shown once), only calling `POST /customers`
 * once nothing (or `force`) says otherwise. The caller reads the
 * discriminated result to decide whether to show `DuplicateWarningSheet` or
 * move on with the created customer. */
export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ form, force }: { form: CustomerForm; force?: boolean }): Promise<CreateCustomerResult> => {
      if (!force) {
        const { matches } = await customersApi.duplicateCheck({
          gstin: form.gstin || null,
          mobile: form.mobile,
          email: form.email || null,
          name: form.name,
          city: form.city,
        });
        if (matches.length > 0) return { kind: 'matches', matches };
      }
      const customer = await customersApi.create(toCustomerIn(form));
      return { kind: 'created', customer };
    },
    onSuccess: (result) => {
      if (result.kind === 'created') qc.invalidateQueries({ queryKey: ['list', '/customers'] });
    },
  });
}
