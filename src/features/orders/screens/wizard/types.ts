import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

/** The wizard's own stack, nested inside the root `NewOrder` route. Route
 * names are distinct from the root stack's so an unqualified
 * `navigation.navigate('OrderDetail', ...)` from a step still resolves upward
 * to the root navigator (React Navigation walks the tree for an unknown name),
 * which is how the success screen leaves the wizard. */
export type WizardParamList = {
  CustomerStep: undefined;
  ProductsStep: undefined;
  CartStep: { errorVariantId?: string; errorMessage?: string } | undefined;
  ReviewStep: undefined;
  WizardSuccess: { orderId: string; number: string; edited: boolean };
};

/** Composite because the steps legitimately address both stacks: their own
 * (next step, back) and the root's (`CustomerCreate`, `OrderDetail`,
 * `RecordPayment` — screens that are not wizard steps). */
export type WizardNav = CompositeNavigationProp<
  NativeStackNavigationProp<WizardParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
