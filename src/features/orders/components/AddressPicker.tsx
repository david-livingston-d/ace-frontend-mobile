import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Select, Banner } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatAddress, type Address } from '@/lib/customers/address';

export type AddressPickerProps = {
  addresses: Address[];
  billingAddressId: string | null;
  shippingAddressId: string | null;
  onChange: (patch: { billingAddressId?: string | null; shippingAddressId?: string | null }) => void;
};

/**
 * Billing and shipping, from the customer's own address book. The shipping
 * address decides GST place of supply, so the two are picked separately even
 * though most customers have one address flagged for both.
 *
 * A customer with no address at all can't be ordered for — the API picks (or
 * rejects) an address on every save. Creating one needs the full address form
 * plus its default flags, which lives on the web; the banner says so rather
 * than half-implementing it here.
 */
export function AddressPicker({ addresses, billingAddressId, shippingAddressId, onChange }: AddressPickerProps) {
  if (addresses.length === 0) {
    return (
      <Banner
        tone="warning"
        title="No address on file"
        body="Add an address for this customer on the web first — an order needs a billing and a shipping address."
      />
    );
  }

  const options = addresses.map((address) => ({ label: formatAddress(address), value: address.id }));

  return (
    <View style={styles.container}>
      <Select
        label="Billing address"
        value={billingAddressId}
        options={options}
        onChange={(value) => onChange({ billingAddressId: value })}
      />
      <Select
        label="Shipping address"
        value={shippingAddressId}
        options={options}
        onChange={(value) => onChange({ shippingAddressId: value })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space[3] },
});
