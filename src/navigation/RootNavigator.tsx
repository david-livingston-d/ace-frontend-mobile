import React from 'react';
import { NavigationContainer, type NavigationState, type PartialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, navigationTheme } from '@/ui';
import { useSession } from '@/store/session';
import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { TabNavigator } from './TabNavigator';
import { linking } from './linking';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export type RootNavigatorProps = {
  /** Slot for Task 5's screen-view analytics — fired on every navigation state change. */
  onStateChange?: (state: NavigationState | PartialState<NavigationState> | undefined) => void;
};

export function RootNavigator({ onStateChange }: RootNavigatorProps) {
  const theme = useTheme();
  const status = useSession((s) => s.status);

  return (
    <NavigationContainer theme={navigationTheme(theme)} linking={linking} onStateChange={onStateChange}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'booting' ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : status === 'signedOut' ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="NewOrder" component={NewOrderScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
