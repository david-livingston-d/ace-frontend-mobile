import { parseISO } from 'date-fns';
import type { StatusTone } from '@/ui/tokens/colors';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * The current instant, shifted so that reading its *UTC* fields back out
 * yields Asia/Kolkata wall-clock time. `toIst` below reads UTC getters off a
 * shifted `Date` for the same reason: `Intl`'s timezone database isn't
 * guaranteed under Hermes, and the device's own local timezone (whatever
 * `Date`'s local getters would use) has nothing to do with the business's
 * single timezone.
 */
export function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/**
 * A calendar date (`'YYYY-MM-DD'`, no time part) carries no instant to
 * convert — it *is* already the day, in whatever timezone the reader cares
 * about. `date-fns`' `parseISO` parses it as local midnight, so shifting the
 * result by the IST offset and reading it back would run it through the
 * device's own timezone for no reason and land on the wrong day for any
 * device west of India (verified: local midnight on 12 Aug under
 * `Pacific/Auckland` is 11 Aug 12:00 UTC, one day short once shifted back).
 * Parsed by hand instead, straight into UTC fields, so it's immune to the
 * device's timezone entirely. A full instant (has a time part / `Z`/offset)
 * still goes through `parseISO` + the IST shift, which is timezone-safe
 * because it resolves to one universal instant before any getter runs.
 */
function toIst(iso: string): Date {
  if (DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(parseISO(iso).getTime() + IST_OFFSET_MS);
}

/** `'2026-08-12'` or `'2026-08-12T...'` -> `'12 Aug 2026'`. */
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

/**
 * IST's today as a `Date` at *local* midnight — the shape the native date
 * picker's `minimumDate`/`maximumDate` want, since it works entirely in the
 * device's own timezone (see `ui/DateField`'s `toIsoDate`). Deliberately not
 * `new Date()`: on a device running ahead of IST that would offer a day the
 * schema's `<= todayIso()` rule then rejects, and on one running behind it
 * would hide today altogether.
 */
export function todayLocalDate(): Date {
  const [year, month, day] = todayIso().split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

/** How urgently a due/expected date (`'YYYY-MM-DD'`) should read against today. */
export function dueTone(expectedDate: string, today: string): StatusTone {
  if (expectedDate < today) return 'danger';
  if (expectedDate === today) return 'warning';
  return 'neutral';
}
