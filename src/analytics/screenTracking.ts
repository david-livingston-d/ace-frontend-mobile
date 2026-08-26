import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { analytics } from './posthog';

// React Navigation 7 has no PostHog autocapture plugin — screens are tracked
// manually from RootNavigator's `onReady`/`onStateChange`, deduped here so a
// state change that doesn't actually change the focused route (e.g. a param
// update) doesn't fire a duplicate `$screen` event.
let lastName: string | undefined;

export function trackNavigationState(nav: NavigationContainerRef<ParamListBase>) {
  const name = nav.getCurrentRoute()?.name;
  if (name && name !== lastName) {
    lastName = name;
    analytics.screen(name);
  }
}

/** Test-only: clears the dedup state between test cases. */
export function resetScreenTracking() {
  lastName = undefined;
}
