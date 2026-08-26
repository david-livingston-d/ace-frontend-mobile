import { identifyProps } from '@/analytics/posthog';

test('identify carries no PII', () => {
  const props = identifyProps({
    id: 'u1',
    email: 'k@ace.in',
    name: 'Karthik',
    is_superadmin: false,
    permissions: {},
    department_id: 'd1',
    team_id: null,
    roles: ['Sales Executive'],
  });
  expect(Object.keys(props).sort()).toEqual(['app_version', 'department_id', 'device_model', 'os_version', 'role']);
  expect(JSON.stringify(props)).not.toMatch(/k@ace\.in|Karthik/);
});
