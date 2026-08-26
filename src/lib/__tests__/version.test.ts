import { compareSemver, decide, shouldShowBanner } from '@/lib/version';

test.each([
  ['1.0.0', '1.0.0', 0],
  ['1.0.1', '1.0.0', 1],
  ['1.0.0', '1.1.0', -1],
  ['2.0.0', '1.9.9', 1],
])('compareSemver(%s,%s)=%i', (a, b, e) => {
  expect(compareSemver(a, b)).toBe(e);
});

test.each([
  ['1.2.0', '1.0.0', '1.2.0', 'ok'],
  ['1.1.0', '1.0.0', '1.2.0', 'update'],
  ['0.9.0', '1.0.0', '1.2.0', 'force'],
  ['1.3.0', '1.0.0', '1.2.0', 'ok'],
])('decide(current=%s, min=%s, latest=%s) = %s', (c, m, l, e) => {
  expect(decide(c, m, l)).toBe(e);
});

test.each([
  ['ok', '1.2.0', null, false],
  ['force', '1.2.0', null, false],
  ['update', '1.2.0', null, true],
  ['update', '1.2.0', '1.1.0', true],
  ['update', '1.2.0', '1.2.0', false],
])('shouldShowBanner(state=%s, latest=%s, dismissed=%s) = %s', (state, latest, dismissed, e) => {
  expect(shouldShowBanner(state as 'ok' | 'update' | 'force', latest, dismissed)).toBe(e);
});
