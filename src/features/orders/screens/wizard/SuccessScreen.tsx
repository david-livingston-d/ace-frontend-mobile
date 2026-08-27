import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { CheckCircle2 } from 'lucide-react-native';
import { Screen, Text, Button, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { usePermission } from '@/lib/permissions';
import { useDraftStore } from '../../store/draft';
import type { WizardNav, WizardParamList } from './types';

/**
 * Mockup C6 — the order exists. Three exits: read it, record money against it,
 * or start the next one. `OrderDetail`/`RecordPayment` are root-stack routes:
 * navigating to a name this nested navigator doesn't know walks up the tree,
 * which is exactly the intent — those screens are not wizard steps.
 */
export function SuccessScreen() {
  const navigation = useNavigation<WizardNav>();
  const route = useRoute<RouteProp<WizardParamList, 'WizardSuccess'>>();
  const { orderId, number, edited } = route.params;
  const theme = useTheme();
  const reset = useDraftStore((s) => s.reset);
  const canRecordPayment = usePermission('payment.create');

  function newOrder() {
    reset();
    navigation.reset({ index: 0, routes: [{ name: 'CustomerStep' }] });
  }

  /**
   * Leaving for the order's own page rewinds the wizard behind us first.
   * Without it, backing out of the detail returns to *this* screen — the
   * success card of an order already placed, sitting on top of an emptied
   * draft — and the way out of that is a second back press. Rewound, back from
   * the detail lands on a fresh step 1, which is the only useful thing the
   * wizard can still be.
   */
  function viewOrder() {
    navigation.reset({ index: 0, routes: [{ name: 'CustomerStep' }] });
    navigation.navigate('OrderDetail', { id: orderId });
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body}>
        <CheckCircle2 size={56} color={theme.colors.tone.success.fg} />
        <Text variant="h3" align="center" style={styles.title}>
          {edited ? `Order ${number} updated` : `Order ${number} created`}
        </Text>
        <Text variant="bodySm" color="textMuted" align="center">
          It is a draft until it is verified.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="View order"
          size="lg"
          fullWidth
          onPress={viewOrder}
        />
        {canRecordPayment ? (
          <Button
            label="Record payment now"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => navigation.navigate('RecordPayment', { orderId })}
          />
        ) : null}
        <Button label="New order" variant="ghost" size="lg" fullWidth onPress={newOrder} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2] },
  title: { marginTop: space[3] },
  actions: { gap: space[2], paddingBottom: space[6] },
});
