import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { CommonActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Home } from 'lucide-react-native';
import { Screen, Text, Button, IconDisc, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { easeStandard, pop } from '@/ui/tokens/motion';
import { usePermission } from '@/lib/permissions';
import type { RootStackParamList } from '@/navigation/types';
import { useDraftStore } from '../../store/draft';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderSuccess'>;

/** The check disc's own diameter — bigger than the empty state's 58 px well,
 * because on this screen it *is* the content (`success` frame's `.okdisc`). */
const DISC = 88;

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

  // The "pop": the disc scales up from half through a slight overshoot and
  // settles — the one moment of celebration in the app, and the only thing on
  // the screen that moves.
  // Typed explicitly: `pop.from` is a literal `0.5` in the token table, and
  // without this the shared value narrows to that literal.
  const scale = useSharedValue<number>(pop.from);
  useEffect(() => {
    scale.value = withSequence(
      withTiming(pop.overshoot, { duration: Math.round(pop.duration * 0.65), easing: easeStandard }),
      withTiming(1, { duration: Math.round(pop.duration * 0.35), easing: easeStandard }),
    );
  }, [scale]);
  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
        <Animated.View style={discStyle}>
          <IconDisc icon={Check} size={DISC} color={theme.colors.tone.success.fg} />
        </Animated.View>
        <Text variant="h3" align="center" style={styles.title}>
          {edited ? `Order ${number} updated` : `Order ${number} created`}
        </Text>
        <Text variant="caption" color="muted" align="center">
          It is a draft until it is verified.
        </Text>
      </View>

      {/* Canvas edit #6: "View order" and "Dashboard" sit side by side as two
          outline buttons under the primary. Without `payment.create` there is
          no primary above them — that action is the only one this screen has
          that everyone does not hold. */}
      <View style={styles.actions}>
        {canRecordPayment ? (
          <Button label="Record payment now" size="lg" fullWidth onPress={recordPayment} />
        ) : null}
        <View style={styles.row}>
          <View style={styles.half}>
            <Button label="View order" variant="outline" fullWidth onPress={viewOrder} />
          </View>
          <View style={styles.half}>
            <Button label="Dashboard" variant="outline" icon={Home} fullWidth onPress={goHome} />
          </View>
        </View>
        <Button label="New order" variant="ghost" size="lg" fullWidth onPress={newOrder} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2] },
  title: { marginTop: space[4] },
  actions: { gap: space[3], paddingBottom: space[6] },
  row: { flexDirection: 'row', gap: space[3] },
  half: { flex: 1 },
});
