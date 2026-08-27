import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Text, Button, Banner, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { usePermission } from '@/lib/permissions';
import { formatMoney } from '@/lib/format/money';
import { CustomerPickerList } from '@/features/customers/components/CustomerPickerList';
import { useCustomerFinancialSummary } from '@/features/customers/hooks';
import { useDraftStore } from '../../store/draft';
import { useSeedCustomer } from '../../hooks';
import { StepHeader } from '../../components/StepHeader';
import { useWizardEntry } from './context';
import type { WizardNav } from './types';

/** Mockup B1 — who the order is for. */
export function CustomerStep() {
  const navigation = useNavigation<WizardNav>();
  const entry = useWizardEntry();
  const customer = useDraftStore((s) => s.customer);
  const clearDraftCustomer = useDraftStore((s) => s.clearCustomer);
  const [pickedId, setPickedId] = useState<string | null>(null);

  // Picking a row only gives the register's summary; the wizard needs the
  // customer's addresses and payment terms, which only the detail carries.
  const seed = useSeedCustomer(pickedId);

  // Forward once per entry (see `WizardEntry`) — a customer chosen in the
  // search screen, or a draft being edited, shouldn't land the user back on
  // "pick a customer" they have already answered.
  const jumped = useRef<string | null>(null);
  useEffect(() => {
    if (!entry.jumpTo || jumped.current === entry.token || entry.awaiting) return;
    jumped.current = entry.token;
    navigation.navigate(entry.jumpTo);
  }, [entry.jumpTo, entry.token, entry.awaiting, navigation]);

  // Re-entering the wizard from the tab bar's "+" starts a *new* order, so the
  // stack has to come back to step 1 — otherwise it re-appears on whatever
  // screen it was left showing, typically the success screen of the order that
  // was just placed.
  //
  // Only ever dispatched when there is genuinely a step to pop. A `popToTop`
  // this stack can't handle (because it is already showing its first screen)
  // does not stop there: React Navigation bubbles an unhandled action up to
  // the parent, and the root stack *can* handle it — by popping the whole
  // wizard off and returning to the tabs. Since the very first focus bumps
  // `visit` too, an unguarded call closed the wizard the instant it opened.
  const lastVisit = useRef(entry.visit);
  useEffect(() => {
    if (lastVisit.current === entry.visit) return;
    lastVisit.current = entry.visit;
    if (entry.fresh && navigation.getState()?.index) navigation.popToTop();
  }, [entry.visit, entry.fresh, navigation]);

  // Through the store's own action rather than `setState`, so what "change
  // customer" means lives in one place: the customer and everything seeded
  // from them go, the picked lines stay (see `clearCustomer` in the store).
  function changeCustomer() {
    setPickedId(null);
    clearDraftCustomer();
  }

  return (
    <Screen title="New order" back={() => navigation.goBack()}>
      {customer ? (
        <>
          <StepHeader step={1} hint="Who is this order for?" />
          <SelectedCustomer name={customer.name} code={customer.code} customerId={customer.id} locked={entry.editing} />
          {!entry.editing ? (
            <View style={styles.changeRow}>
              <Button label="Change customer" variant="ghost" onPress={changeCustomer} />
            </View>
          ) : null}
          <View style={styles.spacer} />
        </>
      ) : (
        <>
          {seed.isError ? (
            <Banner tone="danger" title="That customer couldn't be loaded" body="Pick them again, or try another." />
          ) : null}
          <CustomerPickerList
            header={<StepHeader step={1} hint="Who is this order for?" />}
            onPick={(picked) => setPickedId(picked.id)}
            onCreateNew={() => navigation.navigate('CustomerCreate', { returnTo: 'order' })}
          />
        </>
      )}
      <View style={styles.footer}>
        <Button
          label="Continue"
          size="lg"
          fullWidth
          disabled={!customer}
          loading={seed.isPending}
          onPress={() => navigation.navigate('ProductsStep')}
        />
      </View>
    </Screen>
  );
}

function SelectedCustomer({
  name,
  code,
  customerId,
  locked,
}: {
  name: string;
  code: string;
  customerId: string;
  locked: boolean;
}) {
  const theme = useTheme();
  const canSeeMoney = usePermission('payment.read');
  const { data: summary } = useCustomerFinancialSummary(customerId, canSeeMoney);

  return (
    <Card depth="soft">
      <Text variant="label" color="textMuted">Customer</Text>
      <Text variant="h4" style={styles.name}>{name}</Text>
      {code ? <Text variant="bodySm" color="textMuted">{code}</Text> : null}
      {locked ? (
        <Text variant="caption" color="textSubtle" style={styles.locked}>
          An order snapshots its customer — raise a new order to change it.
        </Text>
      ) : null}
      {summary ? (
        <View style={styles.money}>
          <Text variant="bodySm" color={Number(summary.outstanding) > 0 ? theme.colors.tone.danger.fg : 'textMuted'}>
            {`Outstanding ${formatMoney(summary.outstanding)}`}
          </Text>
          <Text variant="bodySm" color="textMuted">{`Advance ${formatMoney(summary.advance_balance)}`}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { marginTop: space[1] },
  locked: { marginTop: space[2] },
  money: { flexDirection: 'row', gap: space[4], marginTop: space[3] },
  changeRow: { marginTop: space[2], alignItems: 'flex-start' },
  spacer: { flex: 1 },
  footer: { paddingVertical: space[4] },
});
