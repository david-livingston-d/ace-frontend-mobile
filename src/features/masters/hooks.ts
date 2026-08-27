import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { usePermission } from '@/lib/permissions';
import { mastersApi } from './api';

// Every simple lookup list here (customer types, payment terms, categories)
// changes rarely enough that a 10-minute `staleTime` avoids a request every
// time a `Select` mounts, while still refreshing across a normal session.
const MASTERS_STALE_TIME = 10 * 60_000;

export function useCustomerTypes() {
  return useQuery({
    queryKey: keys.masters('customer-types'),
    queryFn: () => mastersApi.customerTypes().then((r) => r.items),
    staleTime: MASTERS_STALE_TIME,
  });
}

// `payment-terms` needs its own permission (`payment_terms.read`) beyond
// whatever screen renders it — the caller decides whether to show the
// `Select` at all (see `CustomerCreateScreen`), and gates this fetch the same
// way so a viewer without it never even sends the request.
export function usePaymentTerms() {
  const enabled = usePermission('payment_terms.read');
  return useQuery({
    queryKey: keys.masters('payment-terms'),
    queryFn: () => mastersApi.paymentTerms().then((r) => r.items),
    enabled,
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.masters('categories'),
    queryFn: () => mastersApi.categories().then((r) => r.items),
    staleTime: MASTERS_STALE_TIME,
  });
}

// Same shape as `usePaymentTerms`: `departments.read` decides whether the
// request goes out at all — `MoreScreen` resolves the signed-in user's
// `department_id` to a name only when this is enabled, and omits the row
// entirely (never a raw UUID) otherwise.
export function useDepartments() {
  const enabled = usePermission('departments.read');
  return useQuery({
    queryKey: keys.masters('departments'),
    queryFn: () => mastersApi.departments().then((r) => r.items),
    enabled,
    staleTime: MASTERS_STALE_TIME,
  });
}
