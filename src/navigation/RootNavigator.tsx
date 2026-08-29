import React from 'react';
import { NavigationContainer, createNavigationContainerRef, type NavigationState, type PartialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, navigationTheme, Screen, ErrorState } from '@/ui';
import { useSession } from '@/store/session';
import { useMe } from '@/features/auth/hooks';
import { getErrorMessage } from '@/lib/api/errors';
import { configError } from '@/lib/env';
import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { NewOrderScreen } from '@/features/orders/screens/NewOrderScreen';
import { SuccessScreen } from '@/features/orders/screens/wizard/SuccessScreen';
import { OrderDetailScreen } from '@/features/orders/screens/OrderDetailScreen';
import { TimelineScreen } from '@/features/orders/screens/TimelineScreen';
import { CustomerSearchScreen } from '@/features/customers/screens/CustomerSearchScreen';
import { CustomerCreateScreen } from '@/features/customers/screens/CustomerCreateScreen';
import { CustomerDetailScreen } from '@/features/customers/screens/CustomerDetailScreen';
import { ProductBrowseScreen } from '@/features/products/screens/ProductBrowseScreen';
import { RecordDeliveryScreen } from '@/features/delivery/screens/RecordDeliveryScreen';
import { DeliveryNoteDetailScreen } from '@/features/delivery/screens/DeliveryNoteDetailScreen';
import { CreateInvoiceScreen } from '@/features/invoices/screens/CreateInvoiceScreen';
import { InvoiceDetailScreen } from '@/features/invoices/screens/InvoiceDetailScreen';
import { RecordPaymentScreen } from '@/features/payments/screens/RecordPaymentScreen';
import { AllocationScreen } from '@/features/payments/screens/AllocationScreen';
import { PaymentDetailScreen } from '@/features/payments/screens/PaymentDetailScreen';
import { ForceUpdateScreen } from '@/features/profile/screens/ForceUpdateScreen';
import { AboutScreen } from '@/features/profile/screens/AboutScreen';
import { PrivacyScreen } from '@/features/profile/screens/PrivacyScreen';
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

  // A release build with no `API_URL` configured (`env.ts` no longer throws
  // for this outside `__DEV__`, so it has to render *something* instead of a
  // blank white screen) — every screen below needs a working API client, so
  // this gates the entire stack the same way `versionState === 'force'` does.
  // There is nothing to retry: the fix is a rebuild with `.env` set.
  if (configError) {
    return (
      <Screen>
        <ErrorState message="App is not configured" />
      </Screen>
    );
  }

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
            {/* The order-placed card. A root route, not a wizard step — see
                `SuccessScreen`'s own note on why the wizard is reset away
                before this is shown. */}
            <Stack.Screen name="OrderSuccess" component={SuccessScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="OrderTimeline" component={TimelineScreen} />
            <Stack.Screen name="CustomerSearch" component={CustomerSearchScreen} />
            <Stack.Screen name="CustomerCreate" component={CustomerCreateScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="ProductBrowse" component={ProductBrowseScreen} />
            <Stack.Screen name="DeliveryNoteDetail" component={DeliveryNoteDetailScreen} />
            <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} />
            <Stack.Screen name="Allocation" component={AllocationScreen} />
            <Stack.Screen name="RecordDelivery" component={RecordDeliveryScreen} />
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
            <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
            <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
