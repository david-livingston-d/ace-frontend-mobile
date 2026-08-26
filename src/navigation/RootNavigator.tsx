import React from 'react';
import { NavigationContainer, createNavigationContainerRef, type NavigationState, type PartialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, navigationTheme, Screen, ErrorState } from '@/ui';
import { useSession } from '@/store/session';
import { useMe } from '@/features/auth/hooks';
import { getErrorMessage } from '@/lib/api/errors';
import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { ForceUpdateScreen } from '@/features/profile/screens/ForceUpdateScreen';
import { useVersionCheck } from '@/lib/version';
import { trackNavigationState } from '@/analytics/screenTracking';
import { TabNavigator } from './TabNavigator';
import { linking } from './linking';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Module-level so the same ref instance backs every render (react-navigation's
// own recommended pattern for navigating/reading state from outside a screen).
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export type RootNavigatorProps = {
  /** Slot for Task 5's screen-view analytics — fired on every navigation state change. */
  onStateChange?: (state: NavigationState | PartialState<NavigationState> | undefined) => void;
};

// Gates the tab bar behind `/auth/me`: `visibleTabs`/`<Can>` need `me` to decide
// what's visible at all, so rendering `TabNavigator` while that query is still
// pending (or stuck on a failed fetch) would show a permission-less bar (More
// only) rather than the user's real tabs. `boot()` deliberately doesn't call
// `/auth/me` itself (see `session.ts`'s 'unavailable' branch) — this gate is
// what turns a signed-in-but-not-yet-verified session into the right screen.
function SignedInGate() {
  const { isPending, isError, error, refetch } = useMe();
  if (isPending) return <SplashScreen />;
  if (isError) {
    return (
      <Screen>
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }
  return <TabNavigator />;
}

export function RootNavigator({ onStateChange }: RootNavigatorProps) {
  const theme = useTheme();
  const status = useSession((s) => s.status);
  const { state: versionState } = useVersionCheck();

  // Below `min_supported_version`: gate the entire stack, including Login —
  // there is no reason to let a build this old even reach the sign-in screen.
  if (versionState === 'force') {
    return <ForceUpdateScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme(theme)}
      linking={linking}
      onReady={() => trackNavigationState(navigationRef)}
      onStateChange={(state) => {
        trackNavigationState(navigationRef);
        onStateChange?.(state);
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'booting' ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : status === 'signedOut' ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={SignedInGate} />
            <Stack.Screen name="NewOrder" component={NewOrderScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
