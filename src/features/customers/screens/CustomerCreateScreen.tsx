import React, { useRef, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormScreen, Input, Select, Button, Banner } from '@/ui';
import { getErrorMessage } from '@/lib/api/errors';
import { CUSTOMER_ERRORS } from '@/lib/sales/errors';
import { usePermission } from '@/lib/permissions';
import { useCustomerTypes, usePaymentTerms } from '@/features/masters/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { customerSchema, type CustomerForm } from '../schema';
import { useCreateCustomer } from '../hooks';
import { AddressForm } from '../components/AddressForm';
import { DuplicateWarningSheet, type DuplicateWarningSheetHandle } from '../components/DuplicateWarningSheet';
import type { CustomerOut, DuplicateMatch } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerCreate'>;

const DEFAULT_VALUES: CustomerForm = {
  name: '',
  customer_type_id: '',
  mobile: '',
  email: '',
  gstin: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  payment_terms_id: '',
  notes: '',
};

export function CustomerCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerCreate'>>();
  const { returnTo } = route.params;

  const { data: customerTypes } = useCustomerTypes();
  const canSeePaymentTerms = usePermission('payment_terms.read');
  const { data: paymentTerms } = usePaymentTerms();
  const create = useCreateCustomer();

  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [pendingForm, setPendingForm] = useState<CustomerForm | null>(null);
  const sheetRef = useRef<DuplicateWarningSheetHandle>(null);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function goTo(customerId: string) {
    // `pickNonce` makes this hand-off distinct from the last one: route
    // params are merged, so handing back the *same* customer twice would
    // otherwise leave `NewOrder`'s params byte-identical and its forward jump
    // unarmed — the rep would land back on step 1 with the customer already
    // chosen and nothing happening.
    if (returnTo === 'order') navigation.navigate('NewOrder', { pickedCustomerId: customerId, pickNonce: Date.now() });
    else if (returnTo === 'payment') navigation.navigate('RecordPayment', { customerId });
    else navigation.navigate('CustomerDetail', { id: customerId });
  }

  function goToCustomer(customer: CustomerOut) {
    goTo(customer.id);
  }

  function goToExisting(customerId: string) {
    goTo(customerId);
  }

  function submit(form: CustomerForm, force?: boolean) {
    setError(null);
    create.mutate(
      { form, force },
      {
        onSuccess: (result) => {
          if (result.kind === 'matches') {
            setPendingForm(form);
            setMatches(result.matches);
            sheetRef.current?.open();
          } else {
            sheetRef.current?.close();
            goToCustomer(result.customer);
          }
        },
        onError: (e) => setError(getErrorMessage(e, CUSTOMER_ERRORS)),
      },
    );
  }

  function onSubmit(form: CustomerForm) {
    submit(form, false);
  }

  function handleCreateAnyway() {
    if (pendingForm) submit(pendingForm, true);
  }

  function handleUseExisting(customerId: string) {
    sheetRef.current?.close();
    goToExisting(customerId);
  }

  return (
    <FormScreen
      title="New customer"
      back={() => navigation.goBack()}
      footer={
        <Button
          label="Save & select"
          fullWidth
          size="lg"
          loading={isSubmitting || create.isPending}
          onPress={handleSubmit(onSubmit)}
        />
      }
    >
      {error ? <Banner tone="danger" title={error} /> : null}

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="Name"
            accessibilityLabel="Name"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="customer_type_id"
        render={({ field, fieldState }) => (
          <Select
            label="Customer type"
            value={field.value || null}
            onChange={(v) => field.onChange(v ?? '')}
            options={(customerTypes ?? []).map((t) => ({ label: t.name, value: t.id }))}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="mobile"
        render={({ field, fieldState }) => (
          <Input
            label="Phone"
            accessibilityLabel="Phone"
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="phone-pad"
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label="Email"
            accessibilityLabel="Email"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="gstin"
        render={({ field, fieldState }) => (
          <Input
            label="GSTIN"
            accessibilityLabel="GSTIN"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            autoCapitalize="characters"
            error={fieldState.error?.message}
          />
        )}
      />

      <AddressForm control={control} />

      {canSeePaymentTerms ? (
        <Controller
          control={control}
          name="payment_terms_id"
          render={({ field, fieldState }) => (
            <Select
              label="Payment terms"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? '')}
              options={(paymentTerms ?? []).map((t) => ({ label: t.name, value: t.id }))}
              clearable
              error={fieldState.error?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <Input
            label="Notes"
            accessibilityLabel="Notes"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            multiline
            error={fieldState.error?.message}
          />
        )}
      />
      <DuplicateWarningSheet
        ref={sheetRef}
        matches={matches}
        onUseExisting={handleUseExisting}
        onCreateAnyway={handleCreateAnyway}
        loading={create.isPending}
      />
    </FormScreen>
  );
}
