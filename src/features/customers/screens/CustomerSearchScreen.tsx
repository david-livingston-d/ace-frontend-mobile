import React from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/ui';
import type { RootStackParamList } from '@/navigation/types';
import { CustomerPickerList } from '../components/CustomerPickerList';
import type { CustomerOut } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerSearch'>;

export function CustomerSearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerSearch'>>();
  const onPick = route.params?.onPick;

  function openCustomer(customer: CustomerOut) {
    if (onPick === 'order') {
      // Same hand-off (and the same sticky-params trap) as
      // `CustomerCreateScreen`'s — see its note on `pickNonce`.
      navigation.navigate('NewOrder', { pickedCustomerId: customer.id, pickNonce: Date.now() });
    } else if (onPick === 'payment') {
      // Back to the payment form that sent us here, now with a customer —
      // `RecordPayment` reads `customerId` off its own params.
      navigation.navigate('RecordPayment', { customerId: customer.id });
    } else {
      navigation.navigate('CustomerDetail', { id: customer.id });
    }
  }

  function createNew() {
    navigation.navigate('CustomerCreate', { returnTo: onPick === 'payment' ? 'payment' : onPick === 'order' ? 'order' : 'detail' });
  }

  return (
    // `bottom` is paid here: this screen has no pinned footer under the
    // picker, so its own "Create new customer" button is the bottom-most thing
    // on it (`CustomerPickerList` deliberately pays no inset of its own).
    <Screen title="Customers" back={() => navigation.goBack()} edges={['top', 'left', 'right', 'bottom']}>
      <CustomerPickerList onPick={openCustomer} onCreateNew={createNew} />
    </Screen>
  );
}
