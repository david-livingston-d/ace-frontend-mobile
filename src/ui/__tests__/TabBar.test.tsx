import React from 'react';
import { StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, render } from '@testing-library/react-native';
import { TabBar } from '@/ui/TabBar';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { TAB_BAR_FLOAT } from '@/ui/tokens/layout';
import { visibleTabs } from '@/navigation/tabs';
import type { MeOut } from '@/lib/api/types';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 34, left: 0 }),
}));

const navigate = jest.fn();
const emit = jest.fn(() => ({ defaultPrevented: false }));

/** The shape React Navigation hands a custom `tabBar`, reduced to what the bar
 * actually reads. `visibleTabs` has already filtered the routes by permission
 * by the time they reach here — a bar with no Payments route is exactly what a
 * user without `payment.read` gets. */
function props(names: string[], index = 0): BottomTabBarProps {
  const routes = names.map((name, i) => ({ key: `${name}-${i}`, name, params: undefined }));
  const descriptors = Object.fromEntries(
    routes.map((route) => [route.key, { options: {}, route, navigation: {} }]),
  );
  return {
    state: { index, routes, type: 'tab', key: 'tab-1', routeNames: names, history: [], stale: false, preloadedRouteKeys: [] },
    descriptors,
    navigation: { navigate, emit, getParent: () => ({ navigate }) },
    insets: { top: 24, right: 0, bottom: 34, left: 0 },
  } as unknown as BottomTabBarProps;
}

const wrap = (p: BottomTabBarProps) => render(<ThemeProvider><TabBar {...p} /></ThemeProvider>);

beforeEach(() => {
  navigate.mockClear();
  emit.mockClear();
});

test('renders every tab plus the centre action', async () => {
  const { getByText, getByLabelText } = await wrap(props(['Home', 'Orders', 'NewOrder', 'Payments', 'More']));
  expect(getByText('HOME')).toBeTruthy();
  expect(getByText('ORDERS')).toBeTruthy();
  expect(getByText('PAYMENTS')).toBeTruthy();
  expect(getByText('MORE')).toBeTruthy();
  expect(getByLabelText('New order')).toBeTruthy();
});

/** A `MeOut` carrying exactly the permission codes named (`permissions` is a
 * `code -> scope` map). `visibleTabs` reads nothing else, so the rest of the
 * payload is not what is under test. */
function me(...codes: string[]): MeOut {
  return {
    is_superadmin: false,
    permissions: Object.fromEntries(codes.map((code) => [code, 'all'])),
  } as unknown as MeOut;
}

// Routed through the real `visibleTabs`, not a hand-written route list: the
// claim is "a user without `payment.read` gets no Payments tab", and a test
// that simply omits the route from its own fixture proves nothing about the
// filter that is supposed to omit it.
test('a tab the user has no permission for is simply not in the bar', async () => {
  const without = visibleTabs(me('sales_order.read', 'sales_order.create'));
  expect(without.map((t) => t.name)).toEqual(['Home', 'Orders', 'NewOrder', 'More']);

  const { queryByText, getByText } = await wrap(props(without.map((t) => t.name)));
  expect(queryByText('PAYMENTS')).toBeNull();
  expect(getByText('ORDERS')).toBeTruthy();
});

test('the Payments tab appears once payment.read is granted', async () => {
  const withPayments = visibleTabs(me('sales_order.read', 'sales_order.create', 'payment.read'));
  expect(withPayments.map((t) => t.name)).toEqual(['Home', 'Orders', 'NewOrder', 'Payments', 'More']);

  const { getByText } = await wrap(props(withPayments.map((t) => t.name)));
  expect(getByText('PAYMENTS')).toBeTruthy();
});

test('the pill floats TAB_BAR_FLOAT above the safe-area inset', async () => {
  const { getByTestId } = await wrap(props(['Home', 'Orders', 'NewOrder', 'More']));
  const style = StyleSheet.flatten(getByTestId('tab-bar-pill').props.style);
  expect(style.bottom).toBe(34 + TAB_BAR_FLOAT);
  expect(TAB_BAR_FLOAT).toBe(12);
});

test('pressing a tab navigates to it', async () => {
  const { getByText } = await wrap(props(['Home', 'Orders', 'NewOrder', 'More']));
  await fireEvent.press(getByText('ORDERS'));
  expect(navigate).toHaveBeenCalledWith('Orders', undefined);
});

test('the centre action leaves the tab navigator for the root wizard route', async () => {
  const { getByLabelText } = await wrap(props(['Home', 'Orders', 'NewOrder', 'More']));
  await fireEvent.press(getByLabelText('New order'));
  expect(navigate).toHaveBeenCalledWith('NewOrder', {});
});
