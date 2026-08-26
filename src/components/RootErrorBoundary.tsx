import React, { type ErrorInfo } from 'react';
import { Screen, ErrorState } from '@/ui';
import { analytics } from '@/analytics/posthog';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Catches render-time errors anywhere below it in the tree. Render errors
 * (unlike thrown promises/async errors — see `App.tsx`'s `ErrorUtils` global
 * handler for those) are the one class of error a JS error boundary can catch.
 */
export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    analytics.captureException(error, { component_stack: info.componentStack ?? '' });
  }

  // There's no reliable cross-platform "restart the app" API in this stack
  // (no react-native-restart dependency) — resetting the boundary's own state
  // re-mounts the crashed subtree, which is the closest equivalent available
  // and matches what the "Retry" action on `ErrorState` already does elsewhere.
  handleRestart = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <Screen>
          <ErrorState message="Something went wrong. Restart the app to continue." onRetry={this.handleRestart} />
        </Screen>
      );
    }
    return this.props.children;
  }
}
