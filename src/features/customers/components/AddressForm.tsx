import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { Input } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { CustomerForm } from '../schema';

export type AddressFormProps = { control: Control<CustomerForm> };

/** The single billing-and-shipping address every new customer is created
 * with (see `toCustomerIn`'s `type: 'both'`) — a dedicated component only so
 * `CustomerCreateScreen`'s own body isn't five more `Controller`s deep. */
export function AddressForm({ control }: AddressFormProps) {
  return (
    <View style={styles.gap}>
      <Controller
        control={control}
        name="line1"
        render={({ field, fieldState }) => (
          <Input
            label="Address line 1"
            accessibilityLabel="Address line 1"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="line2"
        render={({ field, fieldState }) => (
          <Input
            label="Address line 2"
            accessibilityLabel="Address line 2"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <Controller
            control={control}
            name="city"
            render={({ field, fieldState }) => (
              <Input
                label="City"
                accessibilityLabel="City"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        <View style={styles.half}>
          <Controller
            control={control}
            name="state"
            render={({ field, fieldState }) => (
              <Input
                label="State"
                accessibilityLabel="State"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="pincode"
        render={({ field, fieldState }) => (
          <Input
            label="PIN code"
            accessibilityLabel="PIN code"
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="number-pad"
            maxLength={6}
            error={fieldState.error?.message}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space[3] },
  row: { flexDirection: 'row', gap: space[3] },
  half: { flex: 1 },
});
