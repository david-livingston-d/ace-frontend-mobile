import { parseISO } from 'date-fns';
import type { StatusTone } from '@/ui/tokens/colors';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * The current instant, shifted so that reading its *UTC* fields back out
 * yields Asia/Kolkata wall-clock time. Every formatter below reads UTC
 * getters off a shifted `Date` for the same reason: `Intl`'s timezone
 * database isn't guaranteed under Hermes, and the device's own local
 * timezone (whatever `Date`'s local getters would use) has nothing to do
 * with the business's single timezone.
 */
export function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function toIst(iso: string): Date {
  return new Date(parseISO(iso).getTime() + IST_OFFSET_MS);
}

/** `'2026-08-12T...' -> '12 Aug 2026'`. */
export function formatDate(iso: string): string {
  const d = toIst(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** `'2026-08-12T...' -> '12 Aug · 11:42'`. */
export function formatDateTime(iso: string): string {
  const d = toIst(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** Today's calendar date in Asia/Kolkata, as `'YYYY-MM-DD'`. */
export function todayIso(): string {
  const d = istNow();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** How urgently a due/expected date (`'YYYY-MM-DD'`) should read against today. */
export function dueTone(expectedDate: string, today: string): StatusTone {
  if (expectedDate < today) return 'danger';
  if (expectedDate === today) return 'warning';
  return 'neutral';
}
