import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText } from 'lucide-react-native';
import {
  Banner,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  FormScreen,
  HeaderRow,
  Input,
  OfflineBanner,
  Screen,
  Skeleton,
  StepBar,
  Text,
  useIsOnline,
} from '@/ui';
import { gapList, space } from '@/ui/tokens/spacing';
import { toast } from '@/ui/Toast';
import { todayIso } from '@/lib/format/date';
import { addMoney } from '@/lib/sales/calc';
import { formatMoney } from '@/lib/format/money';
import { getBillingErrorMessage } from '@/lib/billing/errors';
import { useMe } from '@/features/auth/hooks';
import { hasPermission } from '@/lib/permissions';
import type { RootStackParamList } from '@/navigation/types';
import { useInvoice, useInvoiceable, useCreateInvoice, useSubmitInvoice } from '../hooks';
import { InvoiceableDnRow } from '../components/InvoiceableDnRow';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateInvoice'>;

/**
 * This screen's own two steps (`create-invoice` frame), named for what the rep
 * is about to *do* — the same split `RecordDeliveryScreen` makes between its
 * imperative `['Create', 'Confirm']` and the note's own past-tense
 * `DELIVERY_STEPS`. The *position* on the track is still the server's: step 0
 * while no invoice exists, step 1 once the draft does.
 */
const CREATE_STEPS = ['Create', 'Submit'];

/**
 * Mockup D4 (`create-invoice` frame) — bill an order's delivered notes.
 *
 * Invoicing is **whole-DN** (PRD §21): the rep picks *notes*, never
 * quantities, and the invoice takes each picked note entire. Nothing is ticked
 * by default — an invoice is a financial document, so which notes go on it is
 * always a deliberate choice — except the one note the rep arrived from
 * (`dnId`, the DN detail's own "Create invoice").
 *
 * The screen's two steps are the *invoice's* real ones, not a client-side
 * wizard: once CREATE succeeds the draft exists server-side, and everything
 * after that is read off the status the server last returned. A submit that
 * fails leaves the draft on screen with CONTINUE — never a lost invoice the
 * rep has to hunt for — and the same draft is reachable again from the order's
 * Invoices card, which routes back here with `invoiceId`.
 */
export function CreateInvoiceScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateInvoice'>>();
  const { orderId, dnId, invoiceId: resumeId } = route.params;

  const { data: me } = useMe();
  const online = useIsOnline();

  // The invoice this screen is driving, once one exists: either created here
  // or handed in to be resumed.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const invoiceId = createdId ?? resumeId ?? null;

  // Only one of these two ever runs: notes are picked *before* an invoice
  // exists, and the draft is fetched only when there is one to resume.
  const invoiceable = useInvoiceable(orderId, !invoiceId);
  const draft = useInvoice(invoiceId ?? '', !!invoiceId);
  const create = useCreateInvoice();
  const submit = useSubmitInvoice();

  const [selected, setSelected] = useState<string[]>(dnId ? [dnId] : []);
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  function can(code: string) {
    return hasPermission(me, code);
  }

  const items = invoiceable.data?.items ?? [];
  // Kept in the server's own order (oldest note first) rather than in tap
  // order, so the invoice's snapshot source is the same note the server would
  // have picked either way.
  const chosen = items.filter((item) => selected.includes(item.dn_id));
  const total = chosen.reduce((sum, item) => addMoney(sum, item.net), '0.00');
  const busy = create.isPending || submit.isPending;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  /** Submit whichever draft this screen is holding — the tail of CREATE, and
   * the whole of CONTINUE after a failure or a resume. */
  function submitInvoice(id: string) {
    submit.mutate(id, {
      onSuccess: (invoice) => {
        toast.show(invoice.number ? `Invoice ${invoice.number} submitted` : 'Invoice submitted');
        // `replace`, not `navigate`: this half-finished screen must not sit
        // behind the order for the back button to fall into.
        navigation.replace('OrderDetail', { id: orderId });
      },
      onError: (e) => toast.show(getBillingErrorMessage(e)),
    });
  }

  function handleCreate() {
    create.mutate(
      {
        soId: orderId,
        body: {
          dn_ids: chosen.map((item) => item.dn_id),
          invoice_date: invoiceDate,
          due_date: dueDate,
          remarks: remarks.trim() || null,
        },
      },
      {
        onSuccess: (invoice) => {
          setCreatedId(invoice.id);
          // Chains only as far as the rep's own permissions reach — stopping
          // here is not a failure, the invoice's own page shows the real
          // status with a CONTINUE for whoever picks it up next.
          if (can('invoice.submit')) {
            submitInvoice(invoice.id);
          } else {
            navigation.replace('InvoiceDetail', { id: invoice.id });
          }
        },
        onError: (e) => {
          toast.show(getBillingErrorMessage(e));
          // Eligibility may have changed since this screen loaded — someone
          // else may have invoiced the note in the meantime.
          invoiceable.refetch();
        },
      },
    );
  }

  const loading = invoiceId ? draft.isPending : invoiceable.isPending;
  if (loading) {
    return (
      <Screen title="Create invoice" back={() => navigation.goBack()}>
        <OfflineBanner />
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={72} />
          <Skeleton width="100%" height={72} />
        </View>
      </Screen>
    );
  }

  if (invoiceId ? draft.isError || !draft.data : invoiceable.isError || !invoiceable.data) {
    const query = invoiceId ? draft : invoiceable;
    return (
      <Screen title="Create invoice" back={() => navigation.goBack()}>
        <ErrorState message={getBillingErrorMessage(query.error)} onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  // --- resume / post-create: the draft exists, all that is left is Submit ---
  if (invoiceId && draft.data) {
    const invoice = draft.data;
    const blocked = !can('invoice.submit');
    return (
      <Screen title="Create invoice" back={() => navigation.goBack()}>
        <View style={styles.body}>
          <OfflineBanner />
          <StepBar
            steps={CREATE_STEPS}
            current={1}
            continueLabel="Continue"
            continueDisabled={blocked || !online}
            continueHint={
              blocked
                ? 'Someone with billing rights needs to submit this invoice'
                : 'You are offline — reconnect to submit this invoice'
            }
            continueLoading={submit.isPending}
            onContinue={blocked || !online ? undefined : () => submitInvoice(invoice.id)}
          />
          <Card padding="row">
            <HeaderRow>
              <View style={styles.headerMain}>
                <Text variant="rowTitle">{invoice.number ?? 'Draft invoice'}</Text>
                <Text variant="caption" color="muted">
                  {`${invoice.so_number} · ${invoice.customer_name}`}
                </Text>
              </View>
              <Text variant="statMoney">{formatMoney(invoice.net)}</Text>
            </HeaderRow>
          </Card>
          <Banner
            tone="info"
            title="This invoice is still a draft"
            body="It has no number until it is submitted, and nothing can be paid against it yet."
          />
          <Card padding="row">
            <Text variant="label" color="muted">Delivery notes</Text>
            {invoice.delivery_notes.map((note) => (
              <Text key={note.dn_id} variant="row" style={styles.noteLine}>{note.number}</Text>
            ))}
          </Card>
          <Button
            label="Open invoice"
            variant="outline"
            fullWidth
            onPress={() => navigation.replace('InvoiceDetail', { id: invoice.id })}
          />
        </View>
      </Screen>
    );
  }

  // --- picking notes ---------------------------------------------------------
  if (items.length === 0) {
    return (
      <Screen title="Create invoice" back={() => navigation.goBack()}>
        <EmptyState
          icon={FileText}
          title="Nothing to invoice"
          hint="Every delivered note on this order is already on a draft or submitted invoice."
        />
      </Screen>
    );
  }

  const noteCount = `${items.length} delivery ${items.length === 1 ? 'note' : 'notes'} ready to invoice`;

  return (
    <FormScreen
      title="Create invoice"
      back={() => navigation.goBack()}
      footer={
        <Button
          label="Create invoice"
          size="lg"
          fullWidth
          disabled={chosen.length === 0 || !online}
          loading={busy}
          onPress={handleCreate}
        />
      }
    >
      <OfflineBanner />

      <StepBar steps={CREATE_STEPS} current={0} />

      <Card padding="row">
        <Text variant="rowTitle">{noteCount}</Text>
        <Text variant="caption" color="muted" style={styles.headerMeta}>
          Invoicing is whole-note — each note you tick is billed entire.
        </Text>
      </Card>

      <View style={styles.notes}>
        {items.map((item) => (
          <InvoiceableDnRow
            key={item.dn_id}
            item={item}
            selected={selected.includes(item.dn_id)}
            onToggle={() => toggle(item.dn_id)}
          />
        ))}
      </View>

      <View style={styles.pairRow}>
        <View style={styles.pairField}>
          <DateField label="Invoice date" value={invoiceDate} onChange={(v) => setInvoiceDate(v ?? todayIso())} />
        </View>
        <View style={styles.pairField}>
          {/* Left empty the due date is derived from the order's payment terms
              server-side — which is the right answer far more often than a
              date typed by hand. */}
          <DateField label="Due date" value={dueDate} onChange={setDueDate} placeholder="From payment terms" clearable />
        </View>
      </View>

      <Input label="Remarks" value={remarks} onChangeText={setRemarks} multiline tall />

      {chosen.length > 0 ? (
        <Card padding="row">
          <HeaderRow>
            <Text variant="label" color="muted">Invoice total</Text>
            <Text variant="statMoney">{formatMoney(total)}</Text>
          </HeaderRow>
          <Text variant="caption" color="muted" style={styles.headerMeta}>
            {`${chosen.length} of ${items.length} ${items.length === 1 ? 'note' : 'notes'} · tax is calculated on submit`}
          </Text>
        </Card>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: gapList },
  skeletonGap: { gap: space[3] },
  headerMain: { flexShrink: 1, gap: space[1] },
  headerMeta: { marginTop: space[1] },
  notes: { gap: space[3] },
  noteLine: { marginTop: space[2] },
  pairRow: { flexDirection: 'row', gap: space[3] },
  pairField: { flex: 1 },
});
