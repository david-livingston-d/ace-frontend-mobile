import { visibleTabs } from '@/navigation/tabs';

const me = (permissions: Record<string, string>, is_superadmin = false) =>
  ({ id: 'u', email: 'e', name: 'n', is_superadmin, permissions, department_id: null, team_id: null, roles: [] });

test('tabs follow permissions, never roles', () => {
  const exec = me({ 'sales_order.read': 'own', 'sales_order.create': 'own', 'payment.read': 'all' });
  expect(visibleTabs(exec).map((t) => t.name)).toEqual(['Home', 'Orders', 'NewOrder', 'Payments', 'More']);
  const viewer = me({ 'sales_order.read': 'all' });
  expect(visibleTabs(viewer).map((t) => t.name)).toEqual(['Home', 'Orders', 'More']);
  const nobody = me({});
  expect(visibleTabs(nobody).map((t) => t.name)).toEqual(['More']);
  expect(visibleTabs(me({}, true)).map((t) => t.name)).toEqual(['Home', 'Orders', 'NewOrder', 'Payments', 'More']);
});
