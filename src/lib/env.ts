import Config from 'react-native-config';

export const env = {
  API_URL: (Config.API_URL ?? '').replace(/\/$/, ''),
  POSTHOG_API_KEY: Config.POSTHOG_API_KEY ?? '',
  POSTHOG_HOST: Config.POSTHOG_HOST ?? 'https://us.i.posthog.com',
  ENV: (Config.ENV ?? 'dev') as 'dev' | 'test' | 'prod',
};

// A missing `API_URL` in a release build must never crash at module
// evaluation — that happens before `RootErrorBoundary` exists to catch
// anything, so the app would white-screen with no way for a user to report
// it. In dev, throwing immediately is still the right failure mode (it's the
// fastest possible signal that `.env` wasn't copied from `.env.example`); in
// release, `configError` is the flag `RootNavigator` renders an `ErrorState`
// for instead of the real navigation stack. A misconfigured *release* build
// should be caught long before install, not discovered here — see the build
// step that asserts `.env` carries a real `API_URL` before packaging.
if (__DEV__ && !env.API_URL) throw new Error('API_URL is not set — copy .env.example to .env');

export const configError = env.API_URL ? null : 'API_URL is not set';
