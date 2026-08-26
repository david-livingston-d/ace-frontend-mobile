import type { LucideIcon } from 'lucide-react-native';
import { Home, ClipboardList, Plus, Wallet, Menu } from 'lucide-react-native';
import type { MeOut } from '@/lib/api/types';
import { hasPermission } from '@/lib/permissions';

export type TabName = 'Home' | 'Orders' | 'NewOrder' | 'Payments' | 'More';
export type TabDef = { name: TabName; label: string; icon: LucideIcon; permission?: string; action?: true };

export const NEW_ORDER_PERMISSION = 'sales_order.create';

export const TABS: TabDef[] = [
  { name: 'Home', label: 'Home', icon: Home, permission: 'sales_order.read' },
  { name: 'Orders', label: 'Orders', icon: ClipboardList, permission: 'sales_order.read' },
  { name: 'NewOrder', label: 'New order', icon: Plus, permission: NEW_ORDER_PERMISSION, action: true },
  { name: 'Payments', label: 'Payments', icon: Wallet, permission: 'payment.read' },
  { name: 'More', label: 'More', icon: Menu },
];

export function visibleTabs(me: MeOut | undefined) {
  return TABS.filter((t) => !t.permission || hasPermission(me, t.permission));
}
