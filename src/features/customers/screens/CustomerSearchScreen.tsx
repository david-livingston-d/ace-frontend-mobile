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
      navigation.navigate('NewOrder', { pickedCustomerId: customer.id });
    } else {
      navigation.navigate('CustomerDetail', { id: customer.id });
    }
  }

  function createNew() {
    navigation.navigate('CustomerCreate', { returnTo: onPick === 'order' ? 'order' : 'detail' });
  }

  return (
    <Screen title="Customers" back={() => navigation.goBack()}>
      <CustomerPickerList onPick={openCustomer} onCreateNew={createNew} />
    </Screen>
  );
}
