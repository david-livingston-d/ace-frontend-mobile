import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { ToastHost, ToastTabBarProvider, useDeclareTabBar, toast } from '@/ui/Toast';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { TAB_BAR_FLOAT, TAB_BAR_HEIGHT } from '@/ui/tokens/layout';
import { space } from '@/ui/tokens/spacing';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 34, left: 0 }),
}));

// The tab bar is the one thing a toast — absolutely positioned over the whole
// window, outside the navigator — can and does land underneath.
function TabBarPresence() {
  useDeclareTabBar();
  return null;
}

function Harness({ tabBar }: { tabBar: boolean }) {
  return (
    <ThemeProvider>
      <ToastTabBarProvider>
        {tabBar ? <TabBarPresence /> : null}
        <ToastHost />
      </ToastTabBarProvider>
    </ThemeProvider>
  );
}

async function showToast() {
  await act(async () => {
    toast.show('Saved');
  });
}

test('a toast on a tab screen sits above the tab bar', async () => {
  const utils = await render(<Harness tabBar />);
  await showToast();
  const style = StyleSheet.flatten(utils.getByTestId('toast').props.style);
  expect(style.bottom).toBe(34 + space[6] + TAB_BAR_HEIGHT + TAB_BAR_FLOAT);
});

test('a toast with no tab bar below it clears only the inset', async () => {
  const utils = await render(<Harness tabBar={false} />);
  await showToast();
  const style = StyleSheet.flatten(utils.getByTestId('toast').props.style);
  expect(style.bottom).toBe(34 + space[6]);
});
