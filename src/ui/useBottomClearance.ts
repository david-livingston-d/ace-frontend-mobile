import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from './tokens/spacing';
import { TAB_BAR_FLOAT, TAB_BAR_HEIGHT } from './tokens/layout';

export type BottomClearanceOptions = {
  /** Pass `true` only for something drawn *over* the tab bar — a toast, a
   * floating badge on a tab screen. A list inside a tab screen does not need
   * it: React Navigation's bottom tab bar is laid out in flow below the scene
   * (`BottomTabView`'s screens container is a flex sibling of the bar), so the
   * scene already ends where the bar begins. */
  tabBar?: boolean;
  /** Anything else pinned over the bottom of this screen — typically a
   * measured footer height. */
  extra?: number;
};

/**
 * How much room the bottom of a scrollable screen must leave so its last row
 * is actually reachable: the safe-area inset (gesture bar / 3-button nav),
 * whatever floats over it, and one gutter so the last row isn't flush against
 * it.
 */
export function useBottomClearance({ tabBar = false, extra = 0 }: BottomClearanceOptions = {}): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + (tabBar ? TAB_BAR_HEIGHT + TAB_BAR_FLOAT : 0) + extra + space[4];
}
