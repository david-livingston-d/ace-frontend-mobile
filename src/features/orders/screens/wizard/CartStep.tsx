import React, { useEffect, useMemo, useRef } from 'react';
import { Keyboard, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ShoppingCart } from 'lucide-react-native';
import { FormScreen, Text, Button, Input, Select, DateField, EmptyState, Banner } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { usePermission } from '@/lib/permissions';
import { todayIso } from '@/lib/format/date';
import { usePaymentTerms } from '@/features/masters/hooks';
import { useDraftStore, selectTotals, selectLineCount, selectUnitCount, draftLines, draftLineSignature } from '../../store/draft';
import { validateDraft, isDraftValid } from '../../mapping';
import { StepHeader } from '../../components/StepHeader';
import { CartLine } from '../../components/CartLine';
import { AddressPicker } from '../../components/AddressPicker';
import { TotalsCard } from '../../components/TotalsCard';
import { DiscountField } from '../../components/DiscountField';
import type { WizardNav, WizardParamList } from './types';

/** Mockup C4 — the order as it stands, and everything about it that isn't a line. */
export function CartStep() {
  const navigation = useNavigation<WizardNav>();
  const route = useRoute<RouteProp<WizardParamList, 'CartStep'>>();
  const serverError = route.params;

  const state = useDraftStore();
  const totals = useDraftStore(selectTotals);
  const lineCount = useDraftStore(selectLineCount);
  const unitCount = useDraftStore(selectUnitCount);
  const lines = useMemo(() => draftLines(state), [state]);

  const canOverrideRate = usePermission('sales_order.rate_override');
  const canOverrideDiscount = usePermission('sales_order.discount_override');
  const canSeePaymentTerms = usePermission('payment_terms.read');
  const { data: paymentTerms } = usePaymentTerms();

  const validation = validateDraft(state, { canOverrideRate });
  const ready = isDraftValid(validation);

  // A server refusal arrives as route params and would otherwise sit there in
  // red for the rest of the wizard's life — including after the user has done
  // exactly what it asked. It survives its first render (so it is actually
  // read), then the first edit to any line clears it: the message described a
  // payload that no longer exists.
  const signature = draftLineSignature(lines);
  const shown = useRef<{ key: string; signature: string } | null>(null);
  useEffect(() => {
    const key = serverError?.errorMessage ? `${serverError.errorVariantId ?? ''}|${serverError.errorMessage}` : null;
    if (!key) {
      shown.current = null;
      return;
    }
    if (shown.current?.key !== key) {
      shown.current = { key, signature };
      return;
    }
    if (shown.current.signature !== signature) {
      shown.current = null;
      navigation.setParams({ errorVariantId: undefined, errorMessage: undefined });
    }
  }, [serverError?.errorMessage, serverError?.errorVariantId, signature, navigation]);

  // The address picker renders its own banner in place of the two selects when
  // the customer has no address, so the header banner would say the same thing
  // twice on one screen. It still *blocks* the review — only the duplicate
  // wording is suppressed.
  const addressless = !!state.customer && state.customer.addresses.length === 0;

  return (
    <FormScreen
      title="Order draft"
      back={() => navigation.goBack()}
      footer={
        <Button
          label="Review order"
          size="lg"
          fullWidth
          disabled={!ready}
          onPress={() => {
            // The rate/discount fields commit every keystroke (see
            // `RateField`), so nothing is lost by leaving one focused — but an
            // open keypad would ride along to the review step and sit over its
            // Confirm button.
            Keyboard.dismiss();
            navigation.navigate('ReviewStep');
          }}
        />
      }
    >
      <StepHeader step={3} hint={`${unitCount} units · ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`} />

      {validation.header && !addressless ? <Banner tone="warning" title={validation.header} /> : null}
      {serverError?.errorMessage && !serverError.errorVariantId ? (
        <Banner tone="danger" title={serverError.errorMessage} />
      ) : null}

      {lines.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Nothing in this order yet"
          hint="Add a product to get started."
          action={{ label: 'Add products', onPress: () => navigation.navigate('ProductsStep') }}
        />
      ) : (
        <>
          {lines.map((line, index) => (
            <CartLine
              key={line.variantId}
              line={line}
              lineTotal={totals.lines[index]?.total ?? 0}
              error={
                validation.lines?.[line.variantId] ??
                (serverError?.errorVariantId === line.variantId ? serverError.errorMessage : undefined)
              }
              highlighted={serverError?.errorVariantId === line.variantId}
              canOverrideRate={canOverrideRate}
              canOverrideDiscount={canOverrideDiscount}
              onQty={(qty) => state.setQty(line.variantId, qty)}
              onRate={(rate) => state.setRate(line.variantId, rate)}
              onDiscount={(pct) => state.setDiscount(line.variantId, pct)}
              onRemove={() => state.remove(line.variantId)}
            />
          ))}
          <Button label="Add more products" variant="outline" onPress={() => navigation.navigate('ProductsStep')} />
        </>
      )}

      <View style={styles.section}>
        <Text variant="label" color="textMuted">Delivery & terms</Text>
      </View>

      <AddressPicker
        addresses={state.customer?.addresses ?? []}
        billingAddressId={state.billingAddressId}
        shippingAddressId={state.shippingAddressId}
        onChange={(patch) => state.setHeader(patch)}
      />

      {canSeePaymentTerms ? (
        <Select
          label="Payment terms"
          value={state.paymentTermsId}
          options={(paymentTerms ?? []).map((t) => ({ label: t.name, value: t.id }))}
          onChange={(value) => state.setHeader({ paymentTermsId: value })}
          clearable
        />
      ) : null}

      <DateField
        label="Approx. committed delivery date"
        value={state.expectedDeliveryDate}
        onChange={(value) => state.setHeader({ expectedDeliveryDate: value })}
        minimumDate={new Date(`${todayIso()}T00:00:00`)}
        placeholder="Not committed"
        clearable
      />

      <Input
        label="Remarks"
        accessibilityLabel="Remarks"
        value={state.remarks}
        onChangeText={(value) => state.setHeader({ remarks: value })}
        multiline
      />

      {canOverrideDiscount ? (
        <View style={styles.orderDiscount}>
          <Text variant="label" color="textMuted">Order discount %</Text>
          <DiscountField label="order" value={state.orderDiscountPct} onChange={state.setOrderDiscountPct} />
        </View>
      ) : null}

      <TotalsCard totals={totals} lines={lines} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space[2] },
  orderDiscount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
