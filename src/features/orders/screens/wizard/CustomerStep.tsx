import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Text, Button, Banner, Divider, StatusChip, useTheme } from '@/ui';
import { gapChips, gutter, space } from '@/ui/tokens/spacing';
import { usePermission } from '@/lib/permissions';
import { formatMoney } from '@/lib/format/money';
import { formatAddress } from '@/lib/customers/address';
import { CustomerPickerList } from '@/features/customers/components/CustomerPickerList';
import { useCustomerFinancialSummary } from '@/features/customers/hooks';
import { useDraftStore } from '../../store/draft';
import { useSeedCustomer } from '../../hooks';
import { StepHeader } from '../../components/StepHeader';
import { useWizardEntry } from './context';
import type { WizardNav } from './types';

/** Mockup B1 (`wizard-1-empty` / `wizard-1-picked`) — who the order is for. */
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
    // No `bottom` edge: the pinned footer below pays that inset once, and
    // `CustomerPickerList` pays none of its own — between them the register
    // used to leave a gutter of dead space under its last row.
    <Screen
      title="New order"
      back={() => navigation.goBack()}
      footer={
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
      }
    >
      {customer ? (
        <>
          <StepHeader step={1} hint="Who is this order for?" />
          <SelectedCustomer
            name={customer.name}
            code={customer.code}
            customerId={customer.id}
            locked={entry.editing}
            onChange={changeCustomer}
          />
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
    </Screen>
  );
}

/**
 * The picked customer, as `wizard-1-picked` draws them: name + type badge over
 * `code · GSTIN`, a hairline, the shipping address, the outstanding (red) /
 * advance (green) chips, and — inside the card's own footer row — the ghost
 * "Change customer". There is no orphan text button under the card: changing
 * the customer is an action *on* this card.
 */
function SelectedCustomer({
  name,
  code,
  customerId,
  locked,
  onChange,
}: {
  name: string;
  code: string;
  customerId: string;
  locked: boolean;
  onChange: () => void;
}) {
  const theme = useTheme();
  const canSeeMoney = usePermission('payment.read');
  const { data: summary } = useCustomerFinancialSummary(customerId, canSeeMoney);
  const addresses = useDraftStore((s) => s.customer?.addresses);
  const shippingAddressId = useDraftStore((s) => s.shippingAddressId);
  const shipping = addresses?.find((a) => a.id === shippingAddressId) ?? addresses?.[0];

  const outstanding = summary ? Number(summary.outstanding) : 0;
  const advance = summary ? Number(summary.advance_balance) : 0;

  return (
    <Card>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text variant="label" color="muted">Customer</Text>
          <Text variant="cardTitle" numberOfLines={2} style={styles.name}>{name}</Text>
          {code ? <Text variant="caption" color="muted">{code}</Text> : null}
        </View>
      </View>

      {shipping ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="caption" color="muted">{formatAddress(shipping)}</Text>
        </>
      ) : null}

      {summary ? (
        <View style={styles.chips}>
          <StatusChip
            tone={outstanding > 0 ? 'danger' : 'neutral'}
            label={`Outstanding ${formatMoney(summary.outstanding)}`}
            size="sm"
          />
          {advance > 0 ? (
            <StatusChip tone="success" label={`Advance ${formatMoney(summary.advance_balance)}`} size="sm" />
          ) : null}
        </View>
      ) : null}

      {locked ? (
        <Text variant="caption" color={theme.colors.subtle} style={styles.locked}>
          An order snapshots its customer — raise a new order to change it.
        </Text>
      ) : (
        <View style={styles.cardFooter}>
          <Button label="Change customer" variant="ghost" size="sm" onPress={onChange} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  headText: { flex: 1, gap: space[1] - 2 },
  name: { marginTop: space[1] - 2 },
  divider: { marginVertical: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips - 1, marginTop: space[3] },
  locked: { marginTop: space[3] },
  cardFooter: { marginTop: space[2], alignItems: 'flex-end' },
  spacer: { flex: 1 },
  // `Screen`'s footer slot sits outside the body, so it re-applies the gutter
  // itself; the safe-area inset below it is `Screen`'s own.
  footer: { paddingHorizontal: gutter, paddingBottom: space[2] },
});
