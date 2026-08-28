import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { RadialSurface } from './Gradient';
import { controlRadius } from './tokens/radius';
import { space } from './tokens/spacing';
import { FAB_SIZE, TAB_BAR_FLOAT, TAB_BAR_HEIGHT, TAB_BAR_INSET, hit } from './tokens/layout';
import { shadow } from './tokens/elevation';
import { TABS } from '@/navigation/tabs';

/**
 * The floating tab pill (`redesign.css` §17 `.tabs`): a translucent capsule
 * inset from both edges, riding `TAB_BAR_FLOAT` above the safe-area inset,
 * with the raised "+" action in the middle.
 *
 * It is laid out *in flow* (its container reserves the pill's height plus the
 * float and the inset), not absolutely: React Navigation's scene ends where
 * this bar begins, which is what lets every list keep the `useBottomClearance`
 * arithmetic Phase A settled on.
 *
 * Which tabs exist at all is decided upstream by `visibleTabs(me)` — a user
 * without `payment.read` never gets a Payments route, so the bar simply has
 * one item fewer. Permission is never re-checked (or re-interpreted) here.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{ height: TAB_BAR_HEIGHT + TAB_BAR_FLOAT + insets.bottom }}
    >
      <View
        testID="tab-bar-pill"
        style={[
          styles.pill,
          {
            bottom: insets.bottom + TAB_BAR_FLOAT,
            left: TAB_BAR_INSET,
            right: TAB_BAR_INSET,
            height: TAB_BAR_HEIGHT,
            borderRadius: controlRadius.tabBar,
            backgroundColor: theme.colors.chrome,
          },
          shadow('tabs', theme.mode),
        ]}
      >
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;

          if (tab.action) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={tab.label === 'New order' ? 'New order' : tab.label}
                onPress={() => {
                  // `NewOrder` is also this navigator's own (empty) route name, so a
                  // plain `navigate('NewOrder')` would resolve to *that* — switching to
                  // a blank tab — instead of bubbling up. Target the root stack, and
                  // pass `{}` rather than nothing: `navigate` *keeps* an existing
                  // route's params when none are given, so a bare call would re-enter
                  // the wizard still carrying the last `editOrderId` and silently
                  // reopen (then re-save) that order.
                  const parent = navigation.getParent();
                  (parent ?? navigation).navigate('NewOrder', {});
                }}
                style={styles.item}
              >
                <View
                  style={[
                    styles.fab,
                    {
                      width: FAB_SIZE,
                      height: FAB_SIZE,
                      borderRadius: controlRadius.fab,
                      backgroundColor: theme.colors.jet,
                    },
                    shadow('fab', theme.mode),
                  ]}
                >
                  {theme.mode === 'light' ? (
                    <RadialSurface stops={theme.colors.heroStops} radius={controlRadius.fab} cx="30%" cy="15%" r="130%" />
                  ) : null}
                  <Plus size={24} color={theme.colors.onJet} />
                </View>
              </Pressable>
            );
          }

          const Icon = tab.icon;
          const color = focused ? theme.colors.text : theme.colors.muted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              hitSlop={hit.tab}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (focused || event.defaultPrevented) return;
                navigation.navigate(route.name, route.params);
              }}
              style={styles.item}
            >
              <Icon size={20} color={color} />
              <Text variant="tab" color={color} maxFontSizeMultiplier={1.2}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: space[3] },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[1] },
  fab: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
});
