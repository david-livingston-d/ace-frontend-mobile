import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommonActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2 } from 'lucide-react-native';
import { Screen, Text, Button, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { usePermission } from '@/lib/permissions';
import type { RootStackParamList } from '@/navigation/types';
import { useDraftStore } from '../../store/draft';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderSuccess'>;

/**
 * Mockup C6 — the order exists.
 *
 * A **root-stack** screen (`OrderSuccess`), not a fifth step inside the wizard:
 * the review step resets the root stack to `[Tabs, OrderSuccess]` on a
 * successful save, so by the time this renders the wizard — and the draft it
 * was built from — is gone. That is what makes every exit here a plain reset
 * rather than a rewind of a stack that shouldn't still exist, and what stops
 * the Android back button from dropping the rep onto the review screen of an
 * order they have already placed.
 */
export function SuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderSuccess'>>();
  const { orderId, number, customerId, edited } = route.params;
  const theme = useTheme();
  const reset = useDraftStore((s) => s.reset);
  const canRecordPayment = usePermission('payment.create');

  /** Every exit is a full reset, so the success card never survives underneath
   * whatever the rep went on to do. */
  const go = useCallback(
    (routes: { name: keyof RootStackParamList; params?: object }[]) => {
      navigation.dispatch(CommonActions.reset({ index: routes.length - 1, routes }));
    },
    [navigation],
  );

  const goOrders = useCallback(() => {
    go([{ name: 'Tabs', params: { screen: 'Orders' } }]);
  }, [go]);

  const goHome = useCallback(() => {
    go([{ name: 'Tabs', params: { screen: 'Home' } }]);
  }, [go]);

  function viewOrder() {
    go([{ name: 'Tabs', params: { screen: 'Orders' } }, { name: 'OrderDetail', params: { id: orderId } }]);
  }

  function recordPayment() {
    go([
      { name: 'Tabs', params: { screen: 'Orders' } },
      { name: 'OrderDetail', params: { id: orderId } },
      { name: 'RecordPayment', params: { orderId, customerId } },
    ]);
  }

  function newOrder() {
    // Cleared here rather than left for the wizard to ask about: the rep has
    // *said* they want a new order, so `fresh` tells `NewOrderScreen` not to
    // put a "Resume draft?" prompt in front of the one it just emptied.
    reset();
    go([{ name: 'Tabs', params: { screen: 'Orders' } }, { name: 'NewOrder', params: { fresh: true } }]);
  }

  // The hardware back button and the back swipe both dispatch GO_BACK/POP, and
  // popping this screen would leave the rep wherever the stack happened to be.
  // Send them to the order list instead — the one place where the order they
  // just placed is visible.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        const type = e.data.action.type;
        if (type !== 'GO_BACK' && type !== 'POP') return;
        e.preventDefault();
        goOrders();
      }),
    [navigation, goOrders],
  );

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
        <Button label="View order" size="lg" fullWidth onPress={viewOrder} />
        {canRecordPayment ? (
          <Button label="Record payment now" variant="outline" size="lg" fullWidth onPress={recordPayment} />
        ) : null}
        <Button label="New order" variant="ghost" size="lg" fullWidth onPress={newOrder} />
        <View style={styles.exits}>
          <Button label="All orders" variant="ghost" onPress={goOrders} />
          <Button label="Home" variant="ghost" onPress={goHome} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2] },
  title: { marginTop: space[3] },
  actions: { gap: space[2], paddingBottom: space[6] },
  exits: { flexDirection: 'row', justifyContent: 'center', gap: space[4] },
});
