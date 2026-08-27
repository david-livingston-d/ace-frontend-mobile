import { INDIAN_STATES, stateName } from '../states';

test('has 36 states/UTs, including Ladakh (38) and Tamil Nadu (33)', () => {
  expect(INDIAN_STATES).toHaveLength(36);
  expect(INDIAN_STATES).toContainEqual({ code: '38', name: 'Ladakh' });
  expect(INDIAN_STATES).toContainEqual({ code: '33', name: 'Tamil Nadu' });
});

test('excludes the retired 25/28 codes and the 97 "Other Territory" code', () => {
  const codes = INDIAN_STATES.map((s) => s.code);
  expect(codes).not.toContain('25');
  expect(codes).not.toContain('28');
  expect(codes).not.toContain('97');
});

test('every code is unique', () => {
  const codes = INDIAN_STATES.map((s) => s.code);
  expect(new Set(codes).size).toBe(codes.length);
});

test('stateName resolves a code to its name, or undefined for an unknown one', () => {
  expect(stateName('33')).toBe('Tamil Nadu');
  expect(stateName('99')).toBeUndefined();
});
