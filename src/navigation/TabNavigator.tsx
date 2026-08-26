import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/ui';
import { useMe } from '@/features/auth/hooks';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { OrdersListScreen } from '@/features/orders/screens/OrdersListScreen';
import { PaymentsTabScreen } from '@/features/payments/screens/PaymentsTabScreen';
import { MoreScreen } from '@/features/profile/screens/MoreScreen';
import { visibleTabs, type TabName } from './tabs';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const SCREENS: Record<Exclude<TabName, 'NewOrder'>, React.ComponentType> = {
  Home: HomeScreen,
  Orders: OrdersListScreen,
  Payments: PaymentsTabScreen,
  More: MoreScreen,
};

// `NewOrder` is registered as a tab (so `visibleTabs`/permission gating covers it
// uniformly) but never renders as one — its `tabBarButton` navigates the root stack
// to the real `NewOrder` screen instead of switching tabs (mockup A2 centre action).
function EmptyRouteComponent() {
  return null;
}

// Named module-level component (not defined inline in `tabBarIcon`) so each render
// reuses the same component type across re-renders.
function TabIcon({ icon: Icon, color, size }: { icon: LucideIcon; color: string; size: number }) {
  return <Icon color={color} size={size} />;
}

function NewOrderTabButton(props: BottomTabBarButtonProps) {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? 'New order'}
      onPress={() => {
        // `NewOrder` is also this tab navigator's own (empty) route name, so a plain
        // `navigation.navigate('NewOrder')` here would resolve to *that* — switching to
        // a blank tab — instead of bubbling up. Target the root stack explicitly.
        const parent = navigation.getParent<NavigationProp<RootStackParamList>>();
        parent?.navigate('NewOrder');
      }}
      style={styles.raisedWrap}
    >
      <View style={[styles.raisedCircle, { backgroundColor: theme.colors.solidBg }]}>
        <Plus size={24} color={theme.colors.solidFg} />
      </View>
    </Pressable>
  );
}

export function TabNavigator() {
  const { data: me } = useMe();
  const theme = useTheme();
  const tabs = visibleTabs(me);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.action ? EmptyRouteComponent : SCREENS[tab.name as Exclude<TabName, 'NewOrder'>]}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: ({ color, size }) => <TabIcon icon={tab.icon} color={color} size={size} />,
            ...(tab.action ? { tabBarButton: NewOrderTabButton } : {}),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  raisedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', top: -12 },
  raisedCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
