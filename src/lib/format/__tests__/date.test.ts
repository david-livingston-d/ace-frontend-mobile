import { formatDate, formatDateTime, todayIso, todayLocalDate, dueTone } from '@/lib/format/date';

// `tsconfig.json` scopes ambient types to `["jest", "react-native"]` (no
// `@types/node`), so `process` isn't declared anywhere in this project.
// This file is the one place that needs it (to flip `TZ` per test case).
declare const process: { env: Record<string, string | undefined> };

// Node re-reads `process.env.TZ` per Date call within a single process (no
// restart required — verified empirically: `new Date(...).getHours()` under
// three different `process.env.TZ` values in one `node -e` invocation each
// reflected the newly-set zone). So a real per-process TZ flip is used here
// rather than `jest.isolateModules`/hand-built expected values: it exercises
// the actual bug this guards against (a calendar date parsed through
// `date-fns`' `parseISO`, which reads local midnight, going through the
// device's timezone before being read back — one day short of the intended
// date on any device east of IST).
describe('formatDate is timezone-independent for a calendar date (no time part)', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  test.each(['Pacific/Auckland', 'America/Los_Angeles', 'Asia/Kolkata'])(
    "formatDate('2026-08-12') === '12 Aug 2026' under TZ=%s",
    (tz) => {
      process.env.TZ = tz;
      expect(formatDate('2026-08-12')).toBe('12 Aug 2026');
    },
  );
});

test('formatDateTime converts a UTC instant to IST wall-clock time', () => {
  expect(formatDateTime('2026-08-12T06:12:00Z')).toBe('12 Aug · 11:42');
});

test('todayIso returns YYYY-MM-DD', () => {
  expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("todayLocalDate is IST's today at the device's local midnight", () => {
  // The native date picker works in the device's own timezone, so the cap it
  // is given has to be IST's calendar day expressed in *local* fields — not
  // `new Date()`, which on a device ahead of IST is already tomorrow.
  const d = todayLocalDate();
  expect(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    .toBe(todayIso());
  expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
});

describe('dueTone', () => {
  test('a date before today is danger', () => {
    expect(dueTone('2026-08-01', '2026-08-12')).toBe('danger');
  });
  test("today's date is warning", () => {
    expect(dueTone('2026-08-12', '2026-08-12')).toBe('warning');
  });
  test('a date after today is neutral', () => {
    expect(dueTone('2026-08-20', '2026-08-12')).toBe('neutral');
  });
});
