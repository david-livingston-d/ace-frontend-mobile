import { create } from 'zustand';
import { PRESET_LABELS, type OrderFilters } from '@/features/orders/filters';

export type FilterChip = { key: string; label: string };

/** `formatDate` without the year — the active-chip row reads "01 Aug – 12 Aug",
 * not "01 Aug 2026 – 12 Aug 2026"; the year adds nothing at register-filter scale. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}

export function chipsFor(f: OrderFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.preset) chips.push({ key: 'preset', label: PRESET_LABELS[f.preset] });
  if (f.dateFrom && f.dateTo) chips.push({ key: 'dates', label: `${shortDate(f.dateFrom)} – ${shortDate(f.dateTo)}` });
  else if (f.dateFrom) chips.push({ key: 'dates', label: `From ${shortDate(f.dateFrom)}` });
  else if (f.dateTo) chips.push({ key: 'dates', label: `Until ${shortDate(f.dateTo)}` });
  if (f.customerId) chips.push({ key: 'customer', label: f.customerName ?? 'Customer' });
  if (f.salesUserId) chips.push({ key: 'salesUser', label: f.salesUserName ?? 'Sales user' });
  if (f.openShortage) chips.push({ key: 'openShortage', label: 'Stock shortage' });
  return chips;
}

const CHIP_CLEAR: Record<string, OrderFilters> = {
  preset: { preset: undefined },
  dates: { dateFrom: undefined, dateTo: undefined },
  customer: { customerId: undefined, customerName: undefined },
  salesUser: { salesUserId: undefined, salesUserName: undefined },
  openShortage: { openShortage: undefined },
};

type FilterStore = {
  filters: OrderFilters;
  set: (partial: OrderFilters) => void;
  reset: () => void;
  chipsFor: (f: OrderFilters) => FilterChip[];
  clearChip: (key: string) => void;
};

// Deliberately not persisted (unlike `src/store/prefs.ts`) — the register's
// filters are a session-scoped view, not a saved preference; a preset the
// Home dashboard's KPI tiles navigate in with shouldn't outlive the screen.
export const useOrderFilters = create<FilterStore>()((set) => ({
  filters: {},
  set: (partial) => set((state) => ({ filters: { ...state.filters, ...partial } })),
  reset: () => set({ filters: {} }),
  chipsFor,
  clearChip: (key) => set((state) => ({ filters: { ...state.filters, ...(CHIP_CLEAR[key] ?? {}) } })),
}));
