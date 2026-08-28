import React, { useCallback } from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { TabBar } from '@/ui';
import { useDeclareTabBar } from '@/ui/Toast';
import { useMe } from '@/features/auth/hooks';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { OrdersListScreen } from '@/features/orders/screens/OrdersListScreen';
import { PaymentsTabScreen } from '@/features/payments/screens/PaymentsTabScreen';
import { MoreScreen } from '@/features/profile/screens/MoreScreen';
import { visibleTabs, type TabName } from './tabs';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const SCREENS: Record<Exclude<TabName, 'NewOrder'>, React.ComponentType> = {
  Home: HomeScreen,
  Orders: OrdersListScreen,
  Payments: PaymentsTabScreen,
  More: MoreScreen,
};

// `NewOrder` is registered as a tab (so `visibleTabs`/permission gating covers it
// uniformly) but never renders as one — `TabBar` turns its item into the raised
// centre action, which navigates the *root* stack to the real `NewOrder` screen
// instead of switching tabs (mockup A2 centre action).
function EmptyRouteComponent() {
  return null;
}

export function TabNavigator() {
  const { data: me } = useMe();
  const tabs = visibleTabs(me);
  // Toasts are rendered over the whole window, above this navigator — this is
  // what tells them the bar is here to clear. Keyed on focus rather than on
  // mounting: this navigator stays mounted under every pushed stack screen,
  // where the bar itself is not on screen.
  useDeclareTabBar(useIsFocused());

  // The floating pill (`src/ui/TabBar.tsx`) replaces the platform bar wholesale
  // — height, safe-area inset, labels and the centre action all live there.
  const renderTabBar = useCallback((props: BottomTabBarProps) => <TabBar {...props} />, []);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.action ? EmptyRouteComponent : SCREENS[tab.name as Exclude<TabName, 'NewOrder'>]}
          options={{ tabBarLabel: tab.label }}
        />
      ))}
    </Tab.Navigator>
  );
}
