import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerStep } from './CustomerStep';
import { ProductsStep } from './ProductsStep';
import { CartStep } from './CartStep';
import { ReviewStep } from './ReviewStep';
import type { WizardParamList } from './types';

const Stack = createNativeStackNavigator<WizardParamList>();

/**
 * The four-step order wizard, nested inside the root `NewOrder` route.
 *
 * A stack (rather than a controlled index) so back is the platform back —
 * gesture, hardware button and the header chevron all pop one step, and each
 * step keeps its own scroll position and sheet state. It always starts on the
 * customer step; entering with a customer or a draft to edit forwards from
 * there (see `WizardEntry`), which is what keeps a real back stack underneath.
 *
 * There is deliberately no success step here: a saved order resets the *root*
 * stack to `[Tabs, OrderSuccess]`, taking this whole navigator with it (see
 * `ReviewStep.confirm`), so nothing half-filled is left behind to go back to.
 */
export function WizardNavigator() {
  return (
    <Stack.Navigator initialRouteName="CustomerStep" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerStep" component={CustomerStep} />
      <Stack.Screen name="ProductsStep" component={ProductsStep} />
      <Stack.Screen name="CartStep" component={CartStep} />
      <Stack.Screen name="ReviewStep" component={ReviewStep} />
    </Stack.Navigator>
  );
}
